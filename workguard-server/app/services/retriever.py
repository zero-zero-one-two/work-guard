from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "workguard_docs")
DOCUMENTS_DIR = os.getenv("DOCUMENTS_DIR", "./documents")

DENSE_MODEL = os.getenv("DENSE_MODEL", "BAAI/bge-base-en-v1.5")
SPARSE_MODEL = os.getenv("SPARSE_MODEL", "Qdrant/bm25")
DENSE_DIM = int(os.getenv("DENSE_DIM", "768"))
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1200"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "320"))

_embedder = None
_client = None


def _get_client():
    global _client
    if _client is None:
        from qdrant_client import QdrantClient
        _client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT, timeout=30)
    return _client


def _get_embedder():
    global _embedder
    if _embedder is None:
        from fastembed import SparseTextEmbedding, TextEmbedding
        _embedder = (
            TextEmbedding(model_name=DENSE_MODEL),
            SparseTextEmbedding(model_name=SPARSE_MODEL),
        )
    return _embedder


def ensure_collection() -> None:
    """
    컬렉션이 없거나 비어 있으면 documents/ 의 MD 파일을 인덱싱한다.
    서버 시작 시 한 번만 호출된다.
    """
    try:
        client = _get_client()
        existing = {c.name for c in client.get_collections().collections}

        if COLLECTION_NAME in existing:
            info = client.get_collection(COLLECTION_NAME)
            if (info.points_count or 0) > 0:
                logger.info(f"Qdrant 컬렉션 '{COLLECTION_NAME}' 이미 존재 ({info.points_count}개 포인트)")
                return

        logger.info(f"Qdrant 컬렉션 '{COLLECTION_NAME}' 인덱싱 시작...")
        _index_documents(client)
        logger.info("인덱싱 완료")

    except Exception as exc:
        logger.warning(f"Qdrant 초기화 실패 (RAG 없이 동작): {exc}")


def _index_documents(client) -> None:
    import uuid
    import tiktoken
    from langchain_community.document_loaders import TextLoader
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from qdrant_client.models import (
        Distance, PointStruct, SparseIndexParams,
        SparseVector, SparseVectorParams, VectorParams,
    )

    docs_dir = Path(DOCUMENTS_DIR)
    md_files = list(docs_dir.rglob("*.md"))
    if not md_files:
        raise FileNotFoundError(f"{docs_dir}에 .md 파일이 없습니다.")

    # 청킹
    encoder = tiktoken.get_encoding("cl100k_base")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=lambda t: len(encoder.encode(t)),
        separators=["\n\n", "\n", ".", " ", ""],
    )
    all_chunks = []
    for f in md_files:
        docs = TextLoader(str(f), encoding="utf-8").load()
        all_chunks.extend(splitter.split_documents(docs))

    texts = [c.page_content for c in all_chunks]
    dense_model, sparse_model = _get_embedder()
    dense_vecs = list(dense_model.embed(texts))
    sparse_vecs = list(sparse_model.embed(texts))

    # 컬렉션 생성 (없으면)
    existing = {c.name for c in client.get_collections().collections}
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config={"dense": VectorParams(size=DENSE_DIM, distance=Distance.COSINE)},
            sparse_vectors_config={"sparse": SparseVectorParams(index=SparseIndexParams(on_disk=False))},
        )

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector={
                "dense": d.tolist(),
                "sparse": SparseVector(indices=s.indices.tolist(), values=s.values.tolist()),
            },
            payload={"text": chunk.page_content, "source": chunk.metadata.get("source", "")},
        )
        for chunk, d, s in zip(all_chunks, dense_vecs, sparse_vecs)
    ]

    batch_size = 32
    for i in range(0, len(points), batch_size):
        client.upsert(collection_name=COLLECTION_NAME, points=points[i:i + batch_size])

    logger.info(f"{len(points)}개 청크 저장 완료")


def retrieve_law_context(contract_text: str, top_k: int = 5) -> str:
    """계약서 텍스트로 관련 법령 청크를 검색한다. 실패 시 빈 문자열 반환."""
    try:
        from qdrant_client.models import Fusion, FusionQuery, Prefetch, SparseVector

        client = _get_client()
        dense_model, sparse_model = _get_embedder()

        query = contract_text[:2000]
        dense_vec = next(iter(dense_model.embed([query]))).tolist()
        sparse_vec = next(iter(sparse_model.embed([query])))

        results = client.query_points(
            collection_name=COLLECTION_NAME,
            prefetch=[
                Prefetch(query=dense_vec, using="dense", limit=top_k * 4),
                Prefetch(
                    query=SparseVector(
                        indices=sparse_vec.indices.tolist(),
                        values=sparse_vec.values.tolist(),
                    ),
                    using="sparse",
                    limit=top_k * 4,
                ),
            ],
            query=FusionQuery(fusion=Fusion.RRF),
            limit=top_k,
        )

        chunks = [p.payload["text"] for p in results.points if p.payload]
        logger.info(f"RAG: {len(chunks)}개 법령 청크 검색")
        return "\n\n---\n\n".join(chunks)

    except Exception as exc:
        logger.warning(f"RAG 검색 실패 (스킵): {exc}")
        return ""

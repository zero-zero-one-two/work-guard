from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)

QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "workguard_docs")
DOCUMENTS_DIR = os.getenv("DOCUMENTS_DIR", "./documents")
UPSTAGE_API_KEY = os.getenv("UPSTAGE_API_KEY", "")

# rag-pipeline과 동일: passage=4096d, query=4096d (same dim, different model)
_DENSE_PASSAGE = "solar-embedding-1-large-passage"
_DENSE_QUERY = "solar-embedding-1-large-query"
_DENSE_DIM = 4096
_SPARSE_MODEL = "Qdrant/bm25"

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1200"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "320"))

_client = None
_sparse_model = None


def _get_client():
    global _client
    if _client is None:
        from qdrant_client import QdrantClient
        _client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT, timeout=30)
    return _client


def _get_sparse_model():
    global _sparse_model
    if _sparse_model is None:
        from fastembed import SparseTextEmbedding
        _sparse_model = SparseTextEmbedding(model_name=_SPARSE_MODEL)
    return _sparse_model


def _embed_dense(texts: list[str], model: str) -> list[list[float]]:
    """Upstage Solar Embedding API 호출 (rag-pipeline과 동일 모델)."""
    import requests as req_lib
    if not UPSTAGE_API_KEY:
        raise RuntimeError("UPSTAGE_API_KEY 환경변수가 설정되지 않았습니다.")
    result: list[list[float]] = []
    batch_size = 32
    for start in range(0, len(texts), batch_size):
        batch = texts[start : start + batch_size]
        resp = req_lib.post(
            "https://api.upstage.ai/v1/embeddings",
            headers={"Authorization": f"Bearer {UPSTAGE_API_KEY}"},
            json={"model": model, "input": batch},
            timeout=30,
        )
        resp.raise_for_status()
        sorted_data = sorted(resp.json()["data"], key=lambda d: d["index"])
        result.extend(d["embedding"] for d in sorted_data)
    return result


def _qdrant_search(query: str, top_k: int = 5) -> list[str]:
    """Hybrid RRF search (dense + BM25 sparse) on Qdrant."""
    from qdrant_client.models import Fusion, FusionQuery, Prefetch, SparseVector

    client = _get_client()
    sparse_model = _get_sparse_model()

    dense_vec = _embed_dense([query], _DENSE_QUERY)[0]
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
    return [p.payload["text"] for p in results.points if p.payload]


def ensure_collection() -> None:
    """컬렉션이 없거나 비어 있으면 documents/ 의 MD 파일을 인덱싱한다."""
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
    sparse_model = _get_sparse_model()
    dense_vecs = _embed_dense(texts, _DENSE_PASSAGE)
    sparse_vecs = list(sparse_model.embed(texts))

    existing = {c.name for c in client.get_collections().collections}
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config={"dense": VectorParams(size=_DENSE_DIM, distance=Distance.COSINE)},
            sparse_vectors_config={"sparse": SparseVectorParams(index=SparseIndexParams(on_disk=False))},
        )

    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector={
                "dense": d,
                "sparse": SparseVector(indices=s.indices.tolist(), values=s.values.tolist()),
            },
            payload={"text": chunk.page_content, "source": chunk.metadata.get("source", "")},
        )
        for chunk, d, s in zip(all_chunks, dense_vecs, sparse_vecs)
    ]

    batch_size = 32
    for i in range(0, len(points), batch_size):
        client.upsert(collection_name=COLLECTION_NAME, points=points[i : i + batch_size])

    logger.info(f"{len(points)}개 청크 저장 완료")


def retrieve_law_context(contract_text: str, top_k: int = 5) -> str:
    """계약서 분석용: 관련 법령 청크 검색. 실패 시 빈 문자열."""
    try:
        chunks = _qdrant_search(contract_text[:2000], top_k=top_k)
        logger.info(f"RAG (계약서): {len(chunks)}개 법령 청크 검색")
        return "\n\n---\n\n".join(chunks)
    except Exception as exc:
        logger.warning(f"RAG 검색 실패 (스킵): {exc}")
        return ""


def retrieve_chat_context(query: str, top_k: int = 5) -> str:
    """채팅용: 사용자 질문으로 관련 법령 청크 검색. 실패 시 빈 문자열."""
    try:
        chunks = _qdrant_search(query[:500], top_k=top_k)
        logger.info(f"RAG (채팅): {len(chunks)}개 법령 청크 검색")
        return "\n\n---\n\n".join(chunks)
    except Exception as exc:
        logger.warning(f"RAG 검색 실패 (스킵): {exc}")
        return ""

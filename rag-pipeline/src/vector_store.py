import logging
import uuid
from pathlib import Path

from langchain_core.documents import Document
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    SparseIndexParams,
    SparseVector,
    SparseVectorParams,
    PointStruct,
    VectorParams,
)

from config import cfg
from src.embedder import HybridEmbedder, HybridEmbedding

logger = logging.getLogger(__name__)

# Qdrant named vector 키 이름
DENSE_VECTOR_NAME = "dense"
SPARSE_VECTOR_NAME = "sparse"

class VectorStore:
    """
    Qdrant 기반 하이브리드 벡터 스토어.

    컬렉션 생성 / 청크 upsert 를 담당한다.
    검색(retrieve)은 별도 모듈에서 이 클라이언트 재사용한다.
    """

    def __init__(self):
        logger.info(f"🔌 Qdrant 연결 중: {cfg.qdrant.host}:{cfg.qdrant.port}")
        self.client = QdrantClient(
            host=cfg.qdrant.host,
            port=cfg.qdrant.port,
            timeout=60,
        )
        self.collection = cfg.qdrant.collection_name
        logger.info("✅ Qdrant 연결 완료")
    
    # ──────────────────────────────────────────────────────────────
    # 컬렉션 관리
    # ──────────────────────────────────────────────────────────────

    def ensure_collection(self) -> None:
        """
        컬렉션이 없으면 dense + sparse 벡터 설정으로 신규 생성,
        이미 있으면 그대로 재사용한다.
        """
        existing = {c.name for c in self.client.get_collections().collections}

        if self.collection in existing:
            logger.info(f"⚠️  컬렉션 '{self.collection}' 이미 존재 → 재사용")
            return
        
        logger.info(f"🗄️  컬렉션 '{self.collection}' 생성 중...")
        self.client.create_collection(
            collection_name=self.collection,
            vectors_config={
                DENSE_VECTOR_NAME: VectorParams(
                    size=cfg.embed.dense_dim,
                    distance=Distance.COSINE,
                )
            },
            sparse_vectors_config={
                SPARSE_VECTOR_NAME: SparseVectorParams(
                    index=SparseIndexParams(on_disk=False)
                )
            }
        )
        logger.info(f"✅ 컬렉션 '{self.collection}' 생성 완료 (dense={cfg.embed.dense_dim}d + sparse BM25)")

    def drop_collection(self) -> None:
        """컬렉션 삭제 (제임베딩 시 초기화용)"""
        self.client.delete_collection(self.collection)
        logger.info(f"🗑️  컬렉션 '{self.collection}' 삭제 완료")
    
    # ──────────────────────────────────────────────────────────────
    # Upsert
    # ──────────────────────────────────────────────────────────────
    
    def upsert_chunks(
        self,
        chunks: list[Document],
        embeddings: list[HybridEmbedding]
    ) -> None:
        """
        청크 + 임베딩 결과를 Qdrant에 배치 upsert한다.
 
        payload 구성:
            - text        : 청크 원문
            - source      : 원본 파일 경로
            - filename    : 파일명만 (검색 필터용)
            - chunk_index : 전체 순번
            - total_chunks: 전체 청크 수
 
        Args:
            chunks    : split_documents()의 결과
            embeddings: HybridEmbedder.embed()의 결과 (chunks와 1:1 대응)
        """
        if len(chunks) != len(embeddings):
            raise ValueError(
                 f"청크 수({len(chunks)})와 임베딩 수({len(embeddings)})가 일치하지 않습니다."
            )
        
        total = len(chunks)
        batch_size = cfg.embed.batch_size
        upserted = 0
        
        for batch_start in range(0, total, batch_size):
            batch_chunks = chunks[batch_start : batch_start + batch_size]
            batch_embeds = embeddings[batch_start : batch_start + batch_size]

            points = [
                self._build_point(chunk, emb)
                for chunk, emb in zip(batch_chunks, batch_embeds)
            ]

            self.client.upsert(collection_name=self.collection, points=points)
            upserted += len(points)
            logger.info(f"🎉 전체 {total}개 청크 Qdrant 저장 완료")

    # ──────────────────────────────────────────────────────────────
    # 내부 헬퍼
    # ──────────────────────────────────────────────────────────────

    @staticmethod
    def _build_point(chunk: Document, emb: HybridEmbedding) -> PointStruct:
        source_path = chunk.metadata.get("source", "")
        return PointStruct(
            id=str(uuid.uuid4()),
            vector={
                DENSE_VECTOR_NAME: emb.dense,
                SPARSE_VECTOR_NAME: SparseVector(
                    indices=emb.sparse_indices,
                    values=emb.sparse_values,
                ),
            },
            payload={
                "text": chunk.page_content,
                "source": source_path,
                "filename": Path(source_path).name if source_path else "",
                "chunk_index": chunk.metadata.get("chunk_index", -1),
                "total_chunks": chunk.metadata.get("total_chunks", -1),
            }
        )
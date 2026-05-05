import logging
from dataclasses import dataclass

from fastembed import SparseTextEmbedding
from openai import OpenAI

from config import cfg

logger = logging.getLogger(__name__)


@dataclass
class HybridEmbedding:
    """단일 청크에 대한 dense + sparse 임베딩 결과"""
    dense: list[float]          # Upstage solar-embedding dense vector (dim=4096)
    sparse_indices: list[int]   # BM25 non-zero 인덱스
    sparse_values: list[float]  # BM25 non-zero 값


class HybridEmbedder:
    """
    Upstage Solar Embedding (dense) + BM25 (sparse) 하이브리드 임베딩 클래스.

    - dense : solar-embedding-1-large-passage — 4096차원, Upstage API 호출
    - sparse: Qdrant/bm25 — 역문서 빈도 기반 sparse vector (fastembed)

    사용 예:
        embedder = HybridEmbedder()
        results = embedder.embed(["텍스트1", "텍스트2"])
    """

    def __init__(self):
        logger.info(f"🔧 Dense 모델 초기화: Upstage {cfg.embed.dense_model}")
        self._upstage = OpenAI(
            api_key=cfg.upstage_api_key,
            base_url="https://api.upstage.ai/v1",
        )

        logger.info(f"🔧 Sparse 모델 로딩: {cfg.embed.sparse_model}")
        self._sparse_model = SparseTextEmbedding(model_name=cfg.embed.sparse_model)

        logger.info("✅ 임베딩 모델 로드 완료")

    def embed(self, texts: list[str]) -> list[HybridEmbedding]:
        """
        텍스트 리스트를 배치 임베딩하여 HybridEmbedding 리스트로 반환.

        Args:
            texts: 임베딩할 텍스트 목록

        Returns:
            각 텍스트에 대응하는 HybridEmbedding 리스트
        """
        if not texts:
            return []

        logger.info(f"🚀 임베딩 시작: {len(texts)}개 텍스트 (batch_size={cfg.embed.batch_size})")

        dense_vectors = self._embed_dense(texts)
        sparse_vectors = list(
            self._sparse_model.embed(texts, batch_size=cfg.embed.batch_size)
        )

        results = [
            HybridEmbedding(
                dense=dense,
                sparse_indices=sparse.indices.tolist(),
                sparse_values=sparse.values.tolist(),
            )
            for dense, sparse in zip(dense_vectors, sparse_vectors)
        ]

        logger.info(f"✅ 임베딩 완료: {len(results)}개")
        return results

    def _embed_dense(self, texts: list[str]) -> list[list[float]]:
        """Upstage API를 배치 단위로 호출하여 dense 벡터 목록을 반환."""
        result: list[list[float]] = []
        batch_size = cfg.embed.batch_size

        for start in range(0, len(texts), batch_size):
            batch = texts[start : start + batch_size]
            response = self._upstage.embeddings.create(
                model=cfg.embed.dense_model,
                input=batch,
            )
            # API 응답의 index 순서대로 정렬하여 입력 순서 보장
            sorted_data = sorted(response.data, key=lambda d: d.index)
            result.extend(d.embedding for d in sorted_data)
            logger.info(f"  Dense 배치 완료: {start + len(batch)}/{len(texts)}")

        return result

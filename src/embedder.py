import logging
from dataclasses import dataclass

import numpy as np
from fastembed import TextEmbedding, SparseTextEmbedding

from config import cfg

logger = logging.getLogger(__name__)

@dataclass
class HybridEmbedding:
    """단일 청크에 대한 dense + sparse 임베딩 결과"""
    dense: list[float]  # BGE-M3 dense vecotr (dim=1024)
    sparse_indices: list[int]  # BM25 non-zero 인덱스
    sparse_values: list[float]  # BM25 non-zero 값

class HybridEmbedder:
    """
    BGE-M3 (dense) + BM25 (sparse) 하이브리드 임베딩 클래스.

    - dense : BAAI/bge-base-en-v1.5 - 768차원 코사인 유사도 기반
    - sparse : BM25 - 역문서 빈도 기반 sparse vector

    사용 예:
        embedder = HybridEmbedder()
        results = embedder.embed(["텍스트1", "텍스트2"])
    """

    def __init__(self):
        logger.info(f"🔧 Dense 모델 로딩: {cfg.embed.dense_model}")
        self._dense_model = TextEmbedding(model_name=cfg.embed.dense_model)

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

        dense_vectors: list[np.ndarray] = list(
            self._dense_model.embed(texts, batch_size=cfg.embed.batch_size)
        )
        sparse_vectors: list[SparseTextEmbedding] = list(
            self._sparse_model.embed(texts, batch_size=cfg.embed.batch_size)
        )

        results = [
            HybridEmbedding(
                dense=dense.tolist(),
                sparse_indices=sparse.indices.tolist(),
                sparse_values=sparse.values.tolist(),

            )
            for dense, sparse in zip(dense_vectors, sparse_vectors)
        ]

        logger.info(f"✅ 임베딩 완료: {len(results)}개")
        return results
        
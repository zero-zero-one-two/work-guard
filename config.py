import os
from dataclasses import dataclass


@dataclass(frozen=True)
class QdrantConfig:
    host: str = os.getenv("QDRANT_HOST", "qdrant")
    port: int = os.getenv("QDRANT_PORT", 6333)
    collection_name: str = os.getenv("COLLECTION_NAME", "workguard_docs")


@dataclass(frozen=True)
class ChunkingConfig:
    # tiktok 기준 실제 토큰 수
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "1200"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP", "320"))
    tiktoken_model: str = os.getenv("TIKTOK_MODEL", "cl100k_base")


@dataclass(frozen=True)
class EmbedConfig:
    dense_model: str = os.getenv("DENSE_MODEL", "BAAI/bge-base-en-v1.5")
    sparse_model: str = os.getenv("SPARSE_MODEL", "Qdrant/bm25")
    dense_dim: int = int(os.getenv("DENSE_DIM", "768"))
    batch_size: int = int(os.getenv("BATCH_SIZE", "32"))

@dataclass(frozen=True)
class AppConfig:
    documents_dir: str = os.getenv("DOCUMENTS_DIR", "./documents")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    qdrant: QdrantConfig = QdrantConfig()
    chunk: ChunkingConfig = ChunkingConfig()
    embed: EmbedConfig = EmbedConfig()

cfg = AppConfig()


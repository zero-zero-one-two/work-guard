import logging
import sys

from config import cfg
from src.loader import load_markdown_documents
from src.chunker import split_documents
from src.embedder import HybridEmbedder
from src.vector_store import VectorStore

def setup_logging() -> None:
    logging.basicConfig(
        level=getattr(logging, cfg.log_level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def run() -> None:
    """
    하이브리드 임베딩 파이프라인 실행 순서:
        1. 문서 로딩     (loader)
        2. 청킹          (chunker  — tiktoken 기준)
        3. 임베딩        (embedder — BGE-M3 dense + BM25 sparse)
        4. Qdrant upsert (vector_store)
    """
    logger = logging.getLogger("main")

    logger.info("=" * 60)
    logger.info("  WorkerGuard 하이브리드 임베딩 파이프라인 시작")
    logger.info(f"  documents_dir : {cfg.documents_dir}")
    logger.info(f"  collection    : {cfg.qdrant.collection_name}")
    logger.info(f"  chunk_size    : {cfg.chunk.chunk_size} tokens")
    logger.info(f"  chunk_overlap : {cfg.chunk.chunk_overlap} tokens")
    logger.info(f"  dense_model   : {cfg.embed.dense_model}")
    logger.info(f"  sparse_model  : {cfg.embed.sparse_model}")
    logger.info("=" * 60)

    # ── 1. 문서 로딩 ───────────────────────────────────────────────
    documents = load_markdown_documents(cfg.documents_dir)

    # ── 2. 청킹 ──────────────────────────────────────────────────
    chunks = split_documents(documents)

    # ── 3. 임베딩 ─────────────────────────────────────────────────
    embedder = HybridEmbedder()
    texts = [chunk.page_content for chunk in chunks]
    embeddings = embedder.embed(texts)

    # ── 4. Qdrant upsert ───────────────────────────────────────────
    store = VectorStore()
    store.ensure_collection()
    store.upsert_chunks(chunks, embeddings)

    logger.info("=" * 60)
    logger.info(" 파이프라인 완료!")
    logger.info("=" * 60)


if __name__ == "__main__":
    setup_logging()
    try:
        run()
    except (FileNotFoundError, ValueError) as e:
        logging.getLogger("main").error(f"❌ 설정 오류: {e}")
        sys.exit(1)
    except Exception as e:
        logging.getLogger("main").error(f"❌ 예외 발생: {e}")
        sys.exit(1)
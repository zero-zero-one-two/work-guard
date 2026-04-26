import logging
import tiktoken
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import cfg

logger = logging.getLogger(__name__)

def _tiktoken_length(text: str, encoder: tiktoken.Encoding) -> int:
    """텍스트의 실제 tiktoken 토큰 수를 반환"""
    return len(encoder.encode(text))

def build_splitter() -> RecursiveCharacterTextSplitter:
    """
    tiktoken 가반의 RecursiveCharacterTextSplitter 생성.
    length_function을 tiktoken encoder로 override하여 chunk_size / chunk_overlap이 '실제 토큰 수' 기준으로 동작한다.
    """
    encoder = tiktoken.get_encoding(cfg.chunk.tiktoken_model)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=cfg.chunk.chunk_size,
        chunk_overlap=cfg.chunk.chunk_overlap,
        length_function=lambda text: _tiktoken_length(text, encoder),
        separators=["\n\n", "\n", ".", " ", ""],
        keep_separator=False,
    )

    logger.info(
        f"✂️ Splitter 생성 완료 | "
        f"encoding={cfg.chunk.tiktoken_model} | "
        f"chunk_size={cfg.chunk.chunk_size} tokens| "
        f"chunk_overlap={cfg.chunk.chunk_overlap} tokens| "
    )

    return splitter


def split_documents(documents: list[Document]) -> list[Document]:
    """
    Document 리스트를 tiktoken 기준 청킹하여 반환.

    각 청크의 metadata에 아래 필드를 추가한다:
    - chunk_index: 전체 청크 목록에서의 순번
    - total_chunks: 전체 청크 수 (사후 주입)

    Args:
        documents: 로딩된 LangChain Document 리스트
    
    Returns:
        청킹된 Document 리스트
    """
    splitter = build_splitter()
    
    chunks = splitter.split_documents(documents)
    total = len(chunks)

    for idx, chunk in enumerate(chunks):
        chunk.metadata["chunk_index"] = idx
        chunk.metadata["total_chunks"] = total
    
    logger.info(
        f"✅ 청킹 완료: 총 {len(documents)}개 문서 -> {total}개 청크")

    if logger.isEnabledFor(logging.DEBUG):
        encoder = tiktoken.get_encoding(cfg.chunk.tiktoken_model)
        tokens_counts = [_tiktoken_length(c.page_content, encoder) for c in chunks]
        logger.debug(
            f"청크 토큰 통계 | "
            f"min={min(token_counts)} | "
            f"max={max(token_counts)} | "
            f"avg={sum(tokens_counts) / total:.1f}"
        )
    
    return chunks
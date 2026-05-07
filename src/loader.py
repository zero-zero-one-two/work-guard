import logging
from pathlib import Path
from typing import List
from langchain_community.document_loaders import TextLoader
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

def load_markdown_documents(documents_dir: str) -> list[Document]:
    """
    지정된 디렉토리에서 모든 .md 파일을 재귀적으로 로드
    
    Args:
        documents_dir: .md 파일이 담긴 루트 디렉토리 경로

    Returns:
        LangChain Document 리스트 (page_content + metadata 포함)
    
    Raises:
        FileNotFoundError: 디렉토리가 존재하지 않을 때
        ValueError: 로드된 문서가 없을 때
    """
    dir_path = Path(documents_dir)
    if not dir_path.exists():
        raise FileNotFoundError(f"문서 디렉토리를 찾을 수 없습니다: {dir.path.resolve()}")
    
    md_files = list(dir_path.rglob("*.md"))
    if not md_files:
        raise ValueError(f"'{dir_path.resolve()}' 에서 .md 파일을 찾을 수 없습니다.")
    
    logger.info(f"📂 총 {len(md_files)}개의 .md 파일 발견")


    documents: list[Document] = []
    for md_file in md_files:
        try:
            loader = TextLoader(str(md_file), encoding="utf-8")
            docs = loader.load()
            documents.extend(docs)
            logger.debug(f"✔ 로딩 완료: {md_file.name}")
        except Exception as e:
            logger.warning(f"❌ 로딩 실패({md_file.name}): {e}")
    if not documents:
        raise ValueError("로딩된 문서가 없습니다. 파일 인코딩 또는 경로를 확인하세요.")
 
    logger.info(f"✅ 문서 로딩 완료: {len(documents)}개 Document 객체 생성")

    # 로딩된 파일 목록 출력(debug)
    sources = {Path(doc.metadata.get("source", "unknown")).name for doc in documents}
    logger.debug(f"로딩된 파일: {sorted(sources)}")

    return documents
    
    
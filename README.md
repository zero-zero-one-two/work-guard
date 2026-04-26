# Work-Guard RAG Embedding Pipeline

노동법 문서를 Qdrant에 하이브리드 임베딩(Dense + Sparse)으로 저장하는 파이프라인입니다.

## 기술 스택

- **Dense 임베딩**: BAAI/bge-base-en-v1.5 (768d, Cosine)
- **Sparse 임베딩**: Qdrant/bm25
- **Vector DB**: Qdrant v1.17
- **chunking**: tiktoken 기준 1200 tokens / 320 overlap
- **문서 형식**: Markdown (.md)

## 프로젝트 구조

```bash
.
├── config.py
├── docker-compose.yml
├── Dockerfile
├── documents
├── main.py
├── README.md
├── requirements.txt
└── src
    ├── __init__.py
    ├── chunker.py
    ├── embedder.py
    ├── loader.py
    └── vector_store.py
```


## 실행 방법

1. `documents/` 폴더에 `.md` 파일 추가

2. 실행

```bash
docker-compose up -d
```

3. `http://localhost:6333/dashboard` 로 접속해 시각적으로 확인 가능

## 파이프라인 흐름

```
Markdown 로딩 → 토큰 기반 청킹 → 하이브리드 임베딩 → Qdrant 저장
```

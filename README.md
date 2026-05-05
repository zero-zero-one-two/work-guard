# Work-Guard RAG Embedding Pipeline

노동법 문서를 Qdrant에 하이브리드 임베딩(Dense + Sparse)으로 저장하는 파이프라인입니다.

## 기술 스택

- **Dense 임베딩**: Upstage `solar-embedding-1-large-passage` (4096d, Cosine)
- **Sparse 임베딩**: `Qdrant/bm25` (fastembed)
- **Vector DB**: Qdrant v1.17
- **Chunking**: tiktoken 기준 1200 tokens / 320 overlap
- **문서 형식**: Markdown (.md)

## 프로젝트 구조

```
.
├── .env                  # UPSTAGE_API_KEY 설정
├── config.py
├── docker-compose.yml
├── Dockerfile
├── documents/            # 임베딩할 .md 파일 위치
├── main.py
├── requirements.txt
└── src/
    ├── chunker.py
    ├── embedder.py       # Upstage dense + BM25 sparse
    ├── loader.py
    └── vector_store.py
```

## 실행 방법

1. `.env` 파일에 Upstage API 키 설정

```env
UPSTAGE_API_KEY=your_api_key_here
```

2. `documents/` 폴더에 `.md` 파일 추가

3. 실행

```bash
docker compose up --build
```

4. `http://localhost:6333/dashboard` 에서 Qdrant 컬렉션 확인 가능

## 파이프라인 흐름

```
Markdown 로딩 → 토큰 기반 청킹 → 하이브리드 임베딩 → Qdrant 저장
                                    ├── Dense  : Upstage API
                                    └── Sparse : BM25 (fastembed)
```

## 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `UPSTAGE_API_KEY` | — | Upstage API 키 (필수) |
| `DENSE_MODEL` | `solar-embedding-1-large-passage` | Dense 임베딩 모델 |
| `DENSE_DIM` | `4096` | Dense 벡터 차원 |
| `SPARSE_MODEL` | `Qdrant/bm25` | Sparse 임베딩 모델 |
| `CHUNK_SIZE` | `1200` | 청크 크기 (토큰) |
| `CHUNK_OVERLAP` | `320` | 청크 오버랩 (토큰) |
| `BATCH_SIZE` | `32` | 임베딩 배치 크기 |
| `COLLECTION_NAME` | `workguard_docs` | Qdrant 컬렉션 이름 |
| `QDRANT_HOST` | `qdrant` | Qdrant 호스트 |
| `QDRANT_PORT` | `6333` | Qdrant 포트 |

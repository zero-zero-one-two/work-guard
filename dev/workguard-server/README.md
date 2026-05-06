# workguard-server

WorkGuard 계약서 분석 백엔드 서버

## 사전 준비

- Python 3.10+
- Docker (Qdrant 실행용)
- [Upstage API 키](https://console.upstage.ai) (OCR용)

## 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일에서 아래 항목 설정:

| 키 | 설명 | 필수 |
|---|---|---|
| `UPSTAGE_API_KEY` | Upstage Document Digitization API 키 | ✅ |
| `MODEL_BACKEND` | LLM 백엔드 (`mlx` / `gguf`) | - |
| `MLX_MODEL` | MLX 모델 ID (기본: `mlx-community/gemma-4-e4b-it-4bit`) | - |
| `GGUF_MODEL_PATH` | GGUF 모델 파일 경로 (`MODEL_BACKEND=gguf` 시) | - |

## 실행 방법

### 로컬 실행 (Apple Silicon, MLX 권장)

```bash
# 1. Qdrant 실행
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant
# 이미 실행 중이면 패스

# 2. 패키지 설치
pip install -r requirements.txt
pip install mlx-lm

# 3. 서버 실행
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

> 첫 실행 시 HuggingFace에서 모델 자동 다운로드 (4B 기준 약 5GB, 이후 캐싱됨)  
> `documents/` 법령 문서가 Qdrant에 자동 인덱싱됨

### Docker 실행 (GGUF)

```bash
# .env에서 MODEL_BACKEND=gguf, GGUF_MODEL_PATH 설정 후
docker-compose up --build
```

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| `POST` | `/contracts/analyze` | 계약서 이미지/PDF 업로드 → 분석 결과 반환 |
| `GET` | `/contracts` | 분석 이력 목록 조회 |
| `GET` | `/contracts/{id}` | 특정 분석 결과 조회 |
| `GET` | `/health` | 서버 상태 확인 |

API 문서: `http://localhost:8000/docs`

## 프로젝트 구조

```
workguard-server/
├── app/
│   ├── db/
│   │   ├── models.py       # ContractAnalysis SQLite 테이블
│   │   └── database.py     # SQLite 엔진 및 세션 관리
│   ├── routers/
│   │   └── contracts.py    # REST API 엔드포인트
│   ├── services/
│   │   ├── ocr.py          # Upstage OCR 호출
│   │   ├── analyzer.py     # LLM 분석 (MLX / GGUF)
│   │   └── retriever.py    # Qdrant RAG 검색 + 법령 인덱싱
│   └── prompt.py           # 한국 노동법 체크리스트 프롬프트
├── documents/              # 법령 원문 MD (자동 인덱싱)
├── data/                   # SQLite DB 저장 경로
├── main.py
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env.example
```

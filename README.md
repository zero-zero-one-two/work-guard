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
    ├── ocr
    │   ├── __init__.py
    │   ├── api.py
    │   ├── run_ocr.py
    │   ├── settings.py
    │   └── service.py
    └── vector_store.py
```

## 실행 방법

1. `documents/` 폴더에 `.md` 파일 추가

2. 실행

```bash
docker-compose up -d
```

3. `http://localhost:6333/dashboard` 로 접속해 시각적으로 확인 가능

## OCR 동작 방식

현재 OCR 기능은 앱에서 업로드한 근로계약서 이미지/PDF를 FastAPI 백엔드가 받아서 Upstage OCR API로 텍스트를 추출하는 구조입니다.

```
React Native 앱
→ FastAPI 백엔드 /ocr
→ Upstage OCR API
→ OCR 텍스트 추출
→ JSON/TXT 저장
→ 앱에 OCR 텍스트 반환
```

파일 역할:

- `src/ocr/service.py`: Upstage OCR 호출과 결과 저장을 담당하는 핵심 함수
- `src/ocr/api.py`: React Native 앱이 파일을 업로드할 FastAPI 엔드포인트
- `src/ocr/run_ocr.py`: 서버 없이 로컬 파일 하나로 OCR만 테스트하는 실행 파일
- `src/ocr/settings.py`: `.env`에서 OCR 관련 환경변수 로드

## OCR 테스트 실행

앱과 연결하기 전에는 서버를 띄우지 않고 이미지/PDF 파일 하나로 OCR만 바로 테스트할 수 있습니다.

```bash
python -m src.ocr.run_ocr ./sample_contract.jpg
```

실행 결과는 `ocr_results/`에 저장됩니다.

- OCR JSON: `ocr_results/*.json`
- OCR 텍스트: `ocr_results/*.txt`

## OCR API 실행

앱에서 사진 업로드를 연결할 때는 FastAPI 서버를 실행합니다.

```bash
uvicorn src.ocr.api:app --reload --port 8000
```

업로드 테스트:

```bash
curl -X POST "http://127.0.0.1:8000/ocr" \
  -F "file=@./sample_contract.jpg"
```

저장 위치:

- API 업로드 원본: `uploads/ocr/`
- OCR JSON: `ocr_results/*.json`
- OCR 텍스트: `ocr_results/*.txt`

## React Native 연결 방식

React Native 앱에서는 `curl`을 쓰지 않고 `fetch`와 `FormData`로 같은 요청을 보냅니다.

```ts
const formData = new FormData();

formData.append("file", {
  uri: imageUri,
  name: "contract.jpg",
  type: "image/jpeg",
} as any);

const response = await fetch("http://SERVER_ADDRESS:8000/ocr", {
  method: "POST",
  body: formData,
});

const result = await response.json();
console.log(result.text);
```

서버 주소는 실행 환경에 따라 다릅니다.

- iOS 시뮬레이터: `http://127.0.0.1:8000`
- Android 에뮬레이터: `http://10.0.2.2:8000`
- 실제 핸드폰: `http://노트북_IP:8000`

실제 핸드폰에서 테스트할 때는 핸드폰과 노트북이 같은 Wi-Fi에 있어야 합니다.

## 이후 개발 플로우

현재 구현 범위는 OCR 텍스트 추출까지입니다.

```
이미지/PDF
→ OCR
→ 텍스트 추출
```

다음 단계에서는 팀원이 만든 RAG 파이프라인을 사용해 OCR 텍스트로 관련 노동법 문서를 검색하고, 이후 LLM으로 위반 여부를 판단합니다.

```
1. 노동법 Markdown 문서를 Qdrant에 저장
   Markdown 로딩 → 토큰 기반 청킹 → Dense/Sparse 임베딩 → Qdrant 저장

2. 사용자가 앱에서 근로계약서 사진 업로드
   React Native → FastAPI /ocr

3. OCR 텍스트 추출
   FastAPI → Upstage OCR → 텍스트 반환

4. RAG 검색
   OCR 텍스트 또는 질문 → Qdrant hybrid search → 관련 법률 chunk 반환

5. LLM 판단
   OCR 텍스트 + 관련 법률 chunk → 위반 의심 항목/근거/대응 안내 생성

6. 리포트 화면 생성
   LLM 판단 결과 → 앱 리포트 UI에 맞는 JSON 변환 → 위반/경고/정상 카드 렌더링
```

예상 API 확장:

```
POST /ocr
사진 업로드 → OCR 텍스트만 반환

POST /contracts/analyze
사진 업로드 → OCR → RAG 검색 → LLM 위반 판단 결과 → 리포트용 JSON 반환
```

리포트 결과는 앱에서 바로 카드 UI로 렌더링할 수 있게 아래와 같은 형태를 목표로 합니다.

```json
{
  "summary": {
    "title": "위반 사항 3건 발견 됐어요",
    "violation_count": 1,
    "warning_count": 2,
    "normal_count": 1
  },
  "items": [
    {
      "status": "violation",
      "label": "위반",
      "title": "연장근무 수당 미명시",
      "law": "근로기준법 제56조",
      "description": "연장근무 시 통상임금의 1.5배 이상을 지급해야 하나, 계약서 내 관련 조항이 없어요.",
      "action_label": "신고 방법 보기"
    },
    {
      "status": "warning",
      "label": "경고",
      "title": "주 52시간 초과 근무 명시",
      "law": "근로기준법 제50조",
      "description": "계약서에 주 52시간을 초과한 근무 일정이 기재되어 있어요.",
      "action_label": "대응 방법 보기"
    },
    {
      "status": "normal",
      "label": "정상",
      "title": "최저임금 기준 충족",
      "law": "최저임금법 제6조",
      "description": "계약 시급이 최저임금 기준에 충족해요.",
      "action_label": null
    }
  ],
  "cta": {
    "label": "챗봇에서 대응 방법 확인하기",
    "target": "chatbot"
  },
  "disclaimer": "본 결과는 법률 자문이 아닌 참고용입니다."
}
```

## 파이프라인 흐름

```
Markdown 로딩 → 토큰 기반 청킹 → 하이브리드 임베딩 → Qdrant 저장
```

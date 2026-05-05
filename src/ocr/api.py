from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.ocr.service import OcrError, run_ocr


app = FastAPI(title="Work-Guard OCR API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class OcrResponse(BaseModel):
    document_id: str
    text: str
    original_path: str
    json_path: str
    text_path: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/ocr", response_model=OcrResponse)
def upload_ocr(file: UploadFile = File(...)) -> OcrResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일명이 비어 있습니다.")

    try:
        result = run_ocr(file.file, file.filename)
    except OcrError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        file.file.close()

    return OcrResponse(
        document_id=result.document_id,
        text=result.text,
        original_path=str(result.original_path),
        json_path=str(result.json_path),
        text_path=str(result.text_path),
    )

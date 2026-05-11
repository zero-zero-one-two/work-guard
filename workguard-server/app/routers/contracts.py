from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.services.analyzer import MODEL_BACKEND, analyze_contract
from app.services.ocr import OcrError, call_ocr
from app.services.retriever import retrieve_law_context

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contracts", tags=["contracts"])


# ── 응답 스키마 ───────────────────────────────────────────────────────

class AnalysisItem(BaseModel):
    id: int
    status: str
    law: str | None
    title: str
    evidence: str | None
    description: str
    actionLabel: str | None


class AnalysisSummary(BaseModel):
    violation: int
    warning: int
    normal: int
    unknown: int


class AnalyzeResponse(BaseModel):
    is_clean: bool
    summary: AnalysisSummary
    items: list[AnalysisItem]
    ocr_text: str
    model_used: str
    backend_used: str
    elapsed_sec: float


# ── 정규화 헬퍼 ───────────────────────────────────────────────────────

def _to_response_item(item: dict[str, Any], idx: int) -> AnalysisItem:
    return AnalysisItem(
        id=int(item.get("id") or idx),
        status=str(item.get("status", "unknown")),
        law=item.get("law"),
        title=str(item.get("title", "")),
        evidence=item.get("evidence"),
        description=str(item.get("description") or item.get("detail") or ""),
        actionLabel=item.get("actionLabel") if "actionLabel" in item else item.get("action"),
    )


# ── 엔드포인트 ────────────────────────────────────────────────────────

@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(file: UploadFile = File(...)) -> AnalyzeResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일명이 비어 있습니다.")

    t_total = time.perf_counter()

    # 1. OCR
    t0 = time.perf_counter()
    try:
        ocr_text = call_ocr(file.file, file.filename)
    except OcrError as exc:
        raise HTTPException(status_code=502, detail=f"OCR 실패: {exc}") from exc
    finally:
        file.file.close()
    logger.info(f"[1/3] OCR 완료 | {time.perf_counter() - t0:.2f}s | {len(ocr_text)}자")

    if not ocr_text.strip():
        raise HTTPException(status_code=422, detail="계약서에서 텍스트를 추출할 수 없습니다.")

    # 2. RAG
    t0 = time.perf_counter()
    law_context = retrieve_law_context(ocr_text)
    logger.info(f"[2/3] RAG 완료 | {time.perf_counter() - t0:.2f}s")

    # 3. 분석
    t0 = time.perf_counter()
    try:
        result = analyze_contract(ocr_text, law_context=law_context)
    except Exception as exc:
        logger.exception("분석 중 오류")
        raise HTTPException(status_code=500, detail=f"분석 실패: {exc}") from exc
    logger.info(f"[3/3] LLM 분석 완료 | {time.perf_counter() - t0:.2f}s")

    meta: dict[str, Any] = result.get("_meta", {})
    summary_raw = result.get("summary", {})
    items_raw = result.get("items", [])

    logger.info(f"✅ 완료 | 총 {time.perf_counter() - t_total:.2f}s | is_clean={result.get('is_clean')} | 위반={summary_raw.get('violation')} 경고={summary_raw.get('warning')}")

    return AnalyzeResponse(
        is_clean=result.get("is_clean", False),
        summary=AnalysisSummary(
            violation=summary_raw.get("violation", 0),
            warning=summary_raw.get("warning", 0),
            normal=summary_raw.get("normal", 0),
            unknown=summary_raw.get("unknown", 0),
        ),
        items=[_to_response_item(item, idx) for idx, item in enumerate(items_raw, start=1)],
        ocr_text=ocr_text,
        model_used=meta.get("model", "unknown"),
        backend_used=meta.get("backend", MODEL_BACKEND),
        elapsed_sec=meta.get("elapsed_sec", 0.0),
    )

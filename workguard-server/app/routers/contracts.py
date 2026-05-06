from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db.database import get_session
from app.db.models import ContractAnalysis
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
    detail: str
    action: str | None


class AnalysisSummary(BaseModel):
    violation: int
    warning: int
    normal: int
    unknown: int


class AnalyzeResponse(BaseModel):
    id: str
    is_clean: bool
    summary: AnalysisSummary
    items: list[AnalysisItem]
    ocr_text: str
    model_used: str
    backend_used: str
    elapsed_sec: float


class ContractListItem(BaseModel):
    id: str
    created_at: str
    original_filename: str
    is_clean: bool
    violation_count: int
    warning_count: int
    normal_count: int


# ── 엔드포인트 ────────────────────────────────────────────────────────

@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
) -> AnalyzeResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="파일명이 비어 있습니다.")

    # 1. OCR
    try:
        ocr_text = call_ocr(file.file, file.filename)
    except OcrError as exc:
        raise HTTPException(status_code=502, detail=f"OCR 실패: {exc}") from exc
    finally:
        file.file.close()

    if not ocr_text.strip():
        raise HTTPException(status_code=422, detail="계약서에서 텍스트를 추출할 수 없습니다.")

    # 2. RAG
    law_context = retrieve_law_context(ocr_text)

    # 3. 분석
    try:
        result = analyze_contract(ocr_text, law_context=law_context)
    except Exception as exc:
        logger.exception("분석 중 오류")
        raise HTTPException(status_code=500, detail=f"분석 실패: {exc}") from exc

    meta: dict[str, Any] = result.get("_meta", {})
    summary_raw = result.get("summary", {})
    items_raw = result.get("items", [])

    # 4. SQLite 저장
    record = ContractAnalysis(
        original_filename=file.filename,
        ocr_text=ocr_text,
        is_clean=result.get("is_clean", False),
        violation_count=summary_raw.get("violation", 0),
        warning_count=summary_raw.get("warning", 0),
        normal_count=summary_raw.get("normal", 0),
        unknown_count=summary_raw.get("unknown", 0),
        items_json=json.dumps(items_raw, ensure_ascii=False),
        model_used=meta.get("model", "unknown"),
        backend_used=meta.get("backend", MODEL_BACKEND),
        elapsed_sec=meta.get("elapsed_sec", 0.0),
    )
    session.add(record)
    session.commit()
    session.refresh(record)

    return AnalyzeResponse(
        id=record.id,
        is_clean=record.is_clean,
        summary=AnalysisSummary(
            violation=record.violation_count,
            warning=record.warning_count,
            normal=record.normal_count,
            unknown=record.unknown_count,
        ),
        items=[AnalysisItem(**item) for item in items_raw],
        ocr_text=ocr_text,
        model_used=record.model_used,
        backend_used=record.backend_used,
        elapsed_sec=record.elapsed_sec,
    )


@router.get("", response_model=list[ContractListItem])
def list_contracts(session: Session = Depends(get_session)) -> list[ContractListItem]:
    records = session.exec(
        select(ContractAnalysis).order_by(ContractAnalysis.created_at.desc())
    ).all()
    return [
        ContractListItem(
            id=r.id,
            created_at=r.created_at.isoformat(),
            original_filename=r.original_filename,
            is_clean=r.is_clean,
            violation_count=r.violation_count,
            warning_count=r.warning_count,
            normal_count=r.normal_count,
        )
        for r in records
    ]


@router.get("/{contract_id}", response_model=AnalyzeResponse)
def get_contract(
    contract_id: str,
    session: Session = Depends(get_session),
) -> AnalyzeResponse:
    record = session.get(ContractAnalysis, contract_id)
    if not record:
        raise HTTPException(status_code=404, detail="분석 결과를 찾을 수 없습니다.")

    return AnalyzeResponse(
        id=record.id,
        is_clean=record.is_clean,
        summary=AnalysisSummary(
            violation=record.violation_count,
            warning=record.warning_count,
            normal=record.normal_count,
            unknown=record.unknown_count,
        ),
        items=[AnalysisItem(**item) for item in record.items],
        ocr_text=record.ocr_text,
        model_used=record.model_used,
        backend_used=record.backend_used,
        elapsed_sec=record.elapsed_sec,
    )

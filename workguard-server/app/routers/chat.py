from __future__ import annotations

import logging
import os
from datetime import date, timedelta
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.db.database import engine
from app.db.models import ContractAnalysis, WorkLog

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e4b")

_CHAT_SYSTEM_BASE = """당신은 한국 노동법 전문 상담 AI입니다.
- 관련 법령을 구체적으로 언급해 주세요 (예: 근로기준법 제00조)
- 사용자의 개인 데이터(근무 기록, 계약서 분석)가 제공된 경우 이를 적극 활용해 구체적으로 답변하세요
- 실질적인 대응 방법을 알려주세요
- 모르는 내용은 솔직하게 모른다고 하세요
- 답변은 한국어로 해주세요"""

# 상담 기관 연결 키워드
_CONSULTATION_KEYWORDS = [
    "상담 받고 싶", "상담받고 싶",
    "상담을 받고 싶", "상담을 받을", "상담을 받",
    "상담 받을", "상담받을",
    "상담 기관", "상담기관", "상담 센터", "상담센터", "상담소",
    "관련 기관", "관련기관",
    "직접 상담", "대면 상담", "전화 상담", "다국어 상담",
    "가까운 센터", "가까운 곳", "가까운 기관", "가까운 상담",
    "찾아가", "어디서 상담",
    "상담 연결", "전문가 상담", "노동청", "고용노동부 상담", "노동 상담 기관",
]

# 근무 기록 조회 키워드
_WORKLOG_KEYWORDS = [
    "내 근무", "제 근무", "내 기록", "제 기록",
    "내 월급", "제 월급", "내 시급", "제 시급",
    "내 야간", "내 초과", "내 연장", "내 휴일",
    "근무 기록", "근무 내역", "출근 기록",
    "이번 달 급여", "월급 계산", "수당 계산", "급여 계산",
]

# 계약서 분석 조회 키워드
_CONTRACT_KEYWORDS = [
    "내 계약서", "제 계약서", "내 계약", "제 계약",
    "분석 결과", "계약서 결과", "위반 항목", "계약서 위반",
    "계약서 분석", "내 근로계약",
]


def _is_consultation_request(text: str) -> bool:
    return any(kw in text for kw in _CONSULTATION_KEYWORDS)


def _needs_worklog(text: str) -> bool:
    return any(kw in text for kw in _WORKLOG_KEYWORDS)


def _needs_contract(text: str) -> bool:
    return any(kw in text for kw in _CONTRACT_KEYWORDS)


def _get_worklog_context() -> str:
    """최근 30일 근무 기록을 텍스트로 포맷."""
    try:
        with Session(engine) as db:
            thirty_days_ago = date.today() - timedelta(days=30)
            logs = db.exec(
                select(WorkLog)
                .where(WorkLog.log_date >= thirty_days_ago)
                .order_by(WorkLog.log_date.asc())
            ).all()

        if not logs:
            return "## 사용자 근무 기록\n최근 30일 내 등록된 근무 기록이 없습니다."

        lines = [f"## 사용자 근무 기록 (최근 30일, {len(logs)}건)\n"]
        total_overtime = 0.0
        for log in logs:
            parts = [str(log.log_date)]
            if log.start_time and log.end_time:
                parts.append(f"{log.start_time}~{log.end_time}")
            if log.fee:
                parts.append(f"시급 {log.fee:,}원")
            if log.is_night_shift:
                parts.append("야간근무")
            if log.is_holiday_work:
                parts.append("휴일근무")
            if log.overtime_hours > 0:
                parts.append(f"연장 {log.overtime_hours}h")
                total_overtime += log.overtime_hours
            lines.append("- " + " | ".join(parts))

        lines.append(f"\n총 연장근무: {total_overtime:.1f}시간")
        return "\n".join(lines)
    except Exception as exc:
        logger.warning(f"WorkLog 조회 실패: {exc}")
        return ""


def _get_contract_context() -> str:
    """가장 최근 계약서 분석 결과를 텍스트로 포맷."""
    try:
        with Session(engine) as db:
            analysis = db.exec(
                select(ContractAnalysis).order_by(ContractAnalysis.created_at.desc())
            ).first()

        if not analysis:
            return "## 사용자 계약서 분석\n등록된 계약서 분석 결과가 없습니다."

        lines = [
            f"## 사용자 근로계약서 분석 결과 (분석일: {analysis.created_at.date()})\n",
            f"- 위반: {analysis.violation_count}개 | 경고: {analysis.warning_count}개 "
            f"| 정상: {analysis.normal_count}개 | 확인불가: {analysis.unknown_count}개\n",
        ]

        items = analysis.items
        problem_items = [i for i in items if i.get("status") in ("violation", "warning")]
        if problem_items:
            lines.append("주요 문제 항목:")
            for item in problem_items:
                label = "위반" if item["status"] == "violation" else "경고"
                desc = item.get("description") or item.get("detail", "")
                law = f" ({item['law']})" if item.get("law") else ""
                lines.append(f"- [{label}] {item['title']}{law}: {desc}")

        return "\n".join(lines)
    except Exception as exc:
        logger.warning(f"ContractAnalysis 조회 실패: {exc}")
        return ""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    category: str | None = None


class ChatResponse(BaseModel):
    reply: str
    type: Literal["chat", "consultation"] = "chat"


@router.post("/message", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    if not req.messages:
        raise HTTPException(status_code=400, detail="메시지가 없습니다.")

    last_user = next(
        (m.content for m in reversed(req.messages) if m.role == "user"), ""
    )
    logger.info(f"[chat] 요청 수신 | 메시지 {len(req.messages)}개 | 마지막: {last_user[:50]}")

    # 1. 상담 기관 연결 의도 감지
    if _is_consultation_request(last_user):
        logger.info("[chat] 상담 기관 연결 의도 감지")
        return ChatResponse(
            reply="가까운 노동 상담 기관을 연결해 드릴게요. GPS 위치를 기반으로 가장 가까운 다국어 상담 센터를 찾아드릴게요.",
            type="consultation",
        )

    # 2. RAG: 법령 검색
    try:
        from app.services.retriever import retrieve_chat_context
        rag_query = f"{req.category}: {last_user}" if req.category else last_user
        law_context = retrieve_chat_context(rag_query, top_k=5)
    except Exception as exc:
        logger.warning(f"RAG 검색 오류 (스킵): {exc}")
        law_context = ""

    # 3. DB: 개인 데이터 조회
    personal_contexts: list[str] = []

    if _needs_worklog(last_user):
        wl = _get_worklog_context()
        if wl:
            personal_contexts.append(wl)
            logger.info("[chat] WorkLog 컨텍스트 주입")

    if _needs_contract(last_user):
        ca = _get_contract_context()
        if ca:
            personal_contexts.append(ca)
            logger.info("[chat] ContractAnalysis 컨텍스트 주입")

    # 4. 시스템 프롬프트 구성
    system_content = _CHAT_SYSTEM_BASE

    if personal_contexts:
        system_content += "\n\n## 사용자 개인 데이터\n\n" + "\n\n".join(personal_contexts)

    if law_context.strip():
        system_content += "\n\n## 관련 법령 참고 조항 (Qdrant 검색 결과)\n\n" + law_context

    has_rag = bool(law_context.strip())
    has_personal = bool(personal_contexts)
    logger.info(f"[chat] 컨텍스트 구성 | RAG={has_rag} | 개인데이터={has_personal}")

    messages = [{"role": "system", "content": system_content}]
    messages += [{"role": m.role, "content": m.content} for m in req.messages]

    # 5. LLM 호출
    try:
        res = httpx.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": messages,
                "stream": False,
                "options": {"temperature": 0.7, "num_predict": -1},
            },
            timeout=180,
        )
        res.raise_for_status()
        reply = res.json()["message"]["content"]
        logger.info(f"[chat] LLM 응답 완료")
        return ChatResponse(reply=reply)
    except Exception as exc:
        logger.exception("챗봇 응답 오류")
        raise HTTPException(status_code=500, detail=f"챗봇 오류: {exc}") from exc

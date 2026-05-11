from __future__ import annotations

import logging
import os
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e4b")

CHAT_SYSTEM_PROMPT = """당신은 한국 노동법 전문 상담 AI입니다.
사용자가 근로계약서 분석 결과를 바탕으로 질문하면, 한국 노동법 기준으로 친절하고 명확하게 답변해 주세요.
- 관련 법령을 구체적으로 언급해 주세요 (예: 근로기준법 제00조)
- 실질적인 대응 방법을 알려주세요
- 모르는 내용은 솔직하게 모른다고 하세요
- 답변은 한국어로 해주세요"""


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


class ChatResponse(BaseModel):
    reply: str


@router.post("/message", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    logger.info(f"[chat] 요청 수신 | 메시지 {len(req.messages)}개 | 마지막: {req.messages[-1].content[:50] if req.messages else '-'}")
    messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]
    messages += [{"role": m.role, "content": m.content} for m in req.messages]

    try:
        res = httpx.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={"model": OLLAMA_MODEL, "messages": messages, "stream": False,
                  "options": {"temperature": 0.7, "num_predict": 1024}},
            timeout=60,
        )
        res.raise_for_status()
        reply = res.json()["message"]["content"]
        logger.info(f"[chat] LLM 응답:\n{reply}")
        return ChatResponse(reply=reply)
    except Exception as exc:
        logger.exception("챗봇 응답 오류")
        raise HTTPException(status_code=500, detail=f"챗봇 오류: {exc}") from exc

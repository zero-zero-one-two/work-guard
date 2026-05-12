from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Any

from app.prompt import SYSTEM_PROMPT, build_user_prompt

logger = logging.getLogger(__name__)

MODEL_BACKEND = os.getenv("MODEL_BACKEND", "ollama")

MLX_MODEL = os.getenv("MLX_MODEL", "mlx-community/gemma-4-e4b-it-4bit")
GGUF_MODEL_PATH = os.getenv("GGUF_MODEL_PATH", "./models/model.gguf")
GGUF_N_CTX = int(os.getenv("GGUF_N_CTX", "8192"))
GGUF_N_GPU_LAYERS = int(os.getenv("GGUF_N_GPU_LAYERS", "-1"))
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e4b")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_OPTIONS = {"temperature": 0, "top_p": 0.8, "num_predict": 4096}

VLLM_MODEL = os.getenv("VLLM_MODEL", "google/gemma-4-e4b-it")
VLLM_BASE_URL = os.getenv("VLLM_BASE_URL", "http://localhost:8001")

_mlx_cache: dict[str, tuple] = {}
_gguf_cache: dict[str, Any] = {}

STATUSES = {"위반", "경고", "정상", "확인불가", "violation", "warning", "normal", "unknown"}
STATUS_TO_REPORT = {
    "위반": "violation", "경고": "warning", "정상": "normal", "확인불가": "unknown",
    "violation": "violation", "warning": "warning", "normal": "normal", "unknown": "unknown",
}
ACTION_BY_STATUS = {
    "violation": "신고 방법 보기", "warning": "대응 방법 보기",
    "normal": None, "unknown": "확인 요청하기",
    "위반": "신고 방법 보기", "경고": "대응 방법 보기",
    "정상": None, "확인불가": "확인 요청하기",
}


# ── JSON 파싱 유틸 ────────────────────────────────────────────────────

def _fix_json(text: str) -> str:
    text = re.sub(r'(\d)"(,)', r'\1\2', text)
    text = re.sub(r'(true|false|null)"(,|})', r'\1\2', text)
    return text


def _strip_fences(text: str) -> str:
    return re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.DOTALL).strip()


def _parse_json(raw: str) -> dict[str, Any]:
    stripped = _strip_fences(raw)
    for candidate in [stripped, re.search(r"\{.*\}", stripped, re.DOTALL)]:
        if candidate is None:
            continue
        text = candidate.group(0) if hasattr(candidate, "group") else candidate
        if not text:
            continue
        try:
            return json.loads(_fix_json(text))
        except (json.JSONDecodeError, TypeError):
            continue
    raise ValueError(f"JSON을 파싱할 수 없습니다: {raw[:300]}")


# ── 정규화 ────────────────────────────────────────────────────────────

def _normalize_analysis(result: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(result, dict):
        raise ValueError("분석 결과는 JSON object여야 합니다.")

    items = result.get("items")
    if not isinstance(items, list) or not items:
        raise ValueError("분석 결과가 예상 JSON 형식이 아닙니다.")

    normalized_items: list[dict[str, Any]] = []
    for item in items:
        if not isinstance(item, dict):
            continue
        raw_status = str(item.get("status", "")).strip()
        if raw_status not in STATUSES:
            continue
        status = STATUS_TO_REPORT[raw_status]
        title = str(item.get("title", "")).strip()
        description = str(item.get("description") or item.get("detail") or "").strip()
        if not title or not description:
            continue
        law = item.get("law")
        evidence = item.get("evidence")
        normalized_items.append({
            "id": len(normalized_items) + 1,
            "status": status,
            "law": law if law not in ("", "null", "None") else None,
            "title": title,
            "evidence": evidence if evidence not in ("", "null", "None") else None,
            "description": description,
            "actionLabel": ACTION_BY_STATUS[status],
        })

    if not normalized_items:
        raise ValueError("유효한 판정 항목이 없습니다.")
    if len(normalized_items) != 10:
        raise ValueError(f"items는 10개여야 합니다: {len(normalized_items)}개")

    counts = {
        "violation": sum(1 for i in normalized_items if i["status"] == "violation"),
        "warning":   sum(1 for i in normalized_items if i["status"] == "warning"),
        "normal":    sum(1 for i in normalized_items if i["status"] == "normal"),
        "unknown":   sum(1 for i in normalized_items if i["status"] == "unknown"),
    }
    return {
        "is_clean": counts["violation"] == 0 and counts["warning"] == 0,
        "summary": counts,
        "items": normalized_items,
    }


# ── Fallback (LLM 실패 시 규칙 기반) ─────────────────────────────────

def _amounts(text: str) -> list[int]:
    amounts: list[int] = []
    for match in re.finditer(r"(\d[\d,]*)\s*원", text):
        try:
            amounts.append(int(match.group(1).replace(",", "")))
        except ValueError:
            continue
    return amounts

def _has_any(text: str, words: tuple[str, ...]) -> bool:
    return any(word in text for word in words)

def _find_money_evidence(text: str, keywords: tuple[str, ...]) -> tuple[int | None, str | None]:
    for match in re.finditer(r"[^.\n]{0,40}?(\d[\d,]*)\s*원[^.\n]{0,20}", text):
        evidence = match.group(0).strip()
        if any(k in evidence for k in keywords):
            try:
                return int(match.group(1).replace(",", "")), evidence
            except ValueError:
                continue
    return None, None

def _is_missing_near(text: str, keyword: str, window: int = 30) -> bool:
    for match in re.finditer(re.escape(keyword), text):
        start = max(0, match.start() - window)
        end = min(len(text), match.end() + window)
        if _has_any(text[start:end], ("미기재", "명시되지 않음", "내용 없음", "없음", "null")):
            return True
    return False

def _evidence_near(text: str, keywords: tuple[str, ...], window: int = 55) -> str | None:
    for keyword in keywords:
        match = re.search(re.escape(keyword), text)
        if match:
            start = max(0, match.start() - window)
            end = min(len(text), match.end() + window)
            return text[start:end].strip(" .,\n\t")
    return None

def _fallback_analysis(contract_text: str, reason: str) -> dict[str, Any]:
    logger.warning(f"LLM JSON 형식 복구 실패, fallback 분석 사용: {reason}")
    text = re.sub(r"\s+", " ", contract_text)
    amounts = _amounts(text)

    def item(id_: int, status: str, law: str | None, title: str,
             evidence: str | None, description: str) -> dict[str, Any]:
        return {"id": id_, "status": status, "law": law, "title": title,
                "evidence": evidence, "description": description,
                "actionLabel": ACTION_BY_STATUS[status]}

    monthly_wage, monthly_evidence = _find_money_evidence(
        text, ("월급", "월 임금", "월임금", "월급여", "기본급", "월(일", "임금"))
    hourly_wage, hourly_evidence = _find_money_evidence(text, ("시급", "시간급"))
    if monthly_wage is None and _has_any(text, ("월급", "기본급", "임금")) and amounts:
        monthly_wage = max(amounts)
        monthly_evidence = _evidence_near(text, ("월급", "임금", f"{monthly_wage:,}원")) or f"{monthly_wage:,}원"
    if hourly_wage is None and _has_any(text, ("시급",)) and amounts:
        hourly_wage = min(amounts)
        hourly_evidence = _evidence_near(text, ("시급", f"{hourly_wage:,}원")) or f"{hourly_wage:,}원"

    items: list[dict[str, Any]] = []

    period_ev = _evidence_near(text, ("근로계약기간", "계약기간", "부터", "까지"))
    items.append(item(1, "normal" if period_ev else "warning", None, "근로계약 기간", period_ev,
        "근로계약 기간 관련 문구가 확인됩니다." if period_ev else "근로계약 기간이 명확하지 않아 보완이 필요합니다."))

    duty_ev = _evidence_near(text, ("업무장소", "근무장소", "업무내용", "담당업무"))
    items.append(item(2, "normal" if duty_ev else "warning", "근로기준법 시행령 제8조", "업무 내용 및 근무 장소", duty_ev,
        "업무 내용과 근무 장소가 확인됩니다." if duty_ev else "업무 내용 또는 근무 장소가 명확하지 않습니다."))

    time_ev = _evidence_near(text, ("근로시간", "근무시간", "휴게시간"))
    items.append(item(3, "normal" if time_ev and _has_any(text, ("휴게",)) else "warning",
        "근로기준법 제50·53조", "근로일, 근로시간, 휴게시간", time_ev,
        "근로시간과 휴게시간이 확인됩니다." if time_ev else "근로시간 또는 휴게시간이 명확하지 않습니다."))

    if monthly_wage is not None:
        ws = "violation" if monthly_wage < 2_096_270 else "normal"
        wd = f"명시된 월급 {monthly_wage:,}원은 2026년 최저임금 기준 월 2,096,270원{'에 미달합니다' if ws == 'violation' else ' 이상입니다'}."
        we = monthly_evidence
    elif hourly_wage is not None:
        ws = "violation" if hourly_wage < 10_030 else "normal"
        wd = f"명시된 시급 {hourly_wage:,}원은 2026년 최저임금 기준 시급 10,030원{'에 미달합니다' if ws == 'violation' else ' 이상입니다'}."
        we = hourly_evidence
    else:
        ws, wd, we = "warning", "임금 금액이 명확히 확인되지 않아 최저임금 충족 여부를 판단할 수 없습니다.", None
    items.append(item(4, ws, "최저임금법 제6조", "임금 구성, 금액, 산정 기준", we, wd))

    pay_ev = _evidence_near(text, ("지급일", "매월", "계좌", "이체"))
    items.append(item(5, "normal" if pay_ev else "warning", "근로기준법 제43조", "임금 지급일, 지급 방법", pay_ev,
        "임금 지급일 또는 지급 방법이 확인됩니다." if pay_ev else "임금 지급일 또는 지급 방법이 명확하지 않습니다."))

    leave_ev = _evidence_near(text, ("주휴", "연차", "유급휴가"))
    items.append(item(6, "normal" if leave_ev else "unknown", "근로기준법 제55·60조", "휴일, 주휴일, 연차유급휴가", leave_ev,
        "휴일 또는 연차유급휴가 관련 문구가 확인됩니다." if leave_ev else "휴일, 주휴일 또는 연차 관련 내용이 없어 판단할 수 없습니다."))

    ot_ev = _evidence_near(text, ("연장", "야간", "휴일근로", "가산수당", "포괄임금"))
    if ot_ev and _has_any(ot_ev, ("미지급", "없음")):
        ot_s = "violation"
    elif ot_ev:
        ot_s = "warning" if _has_any(ot_ev, ("고정", "포괄")) else "normal"
    else:
        ot_s = "unknown"
    items.append(item(7, ot_s, "근로기준법 제56조", "연장·야간·휴일근로 및 가산수당", ot_ev,
        "가산수당 미지급 조항은 법 위반 소지가 있습니다." if ot_s == "violation" else
        "고정 수당으로 법정 기준 충족 여부 확인이 필요합니다." if ot_s == "warning" else
        "가산수당 지급 기준이 확인됩니다." if ot_s == "normal" else "가산수당 관련 내용이 없어 판단할 수 없습니다."))

    ret_ev = _evidence_near(text, ("퇴직금", "퇴직급여"))
    items.append(item(8, "normal" if ret_ev else "unknown", "근로자퇴직급여 보장법 제8조", "퇴직금/퇴직급여", ret_ev,
        "퇴직금 관련 문구가 확인됩니다." if ret_ev else "퇴직금 관련 내용이 없어 판단할 수 없습니다."))

    term_ev = _evidence_near(text, ("해고", "퇴직", "계약 해지", "30일 전"))
    items.append(item(9, "normal" if term_ev else "unknown", "근로기준법 제26조", "계약 해지, 퇴직, 해고예고", term_ev,
        "해고예고 관련 문구가 확인됩니다." if term_ev else "해고예고 관련 내용이 없어 판단할 수 없습니다."))

    dmg_ev = _evidence_near(text, ("위약금", "손해배상", "임금에서 공제"))
    items.append(item(10, "violation" if dmg_ev else "normal", "근로기준법 제20조", "손해배상, 위약금, 임금 공제", dmg_ev,
        "손해배상 예정 또는 임금 공제 조항이 확인되어 법 위반 소지가 있습니다." if dmg_ev else
        "손해배상 예정, 위약금 또는 임금 공제 조항은 확인되지 않습니다."))

    return _normalize_analysis({"items": items})


# ── MLX 백엔드 ────────────────────────────────────────────────────────

def _mlx_analyze(contract_text: str, law_context: str) -> tuple[str, str]:
    from mlx_lm import generate, load
    if MLX_MODEL not in _mlx_cache:
        logger.info(f"MLX 모델 로딩: {MLX_MODEL}")
        _mlx_cache[MLX_MODEL] = load(MLX_MODEL)
    model, tokenizer = _mlx_cache[MLX_MODEL]
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_user_prompt(contract_text, law_context)},
    ]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    raw = generate(model, tokenizer, prompt=prompt, max_tokens=4096, temp=0.1, verbose=False)
    return raw, MLX_MODEL


# ── GGUF 백엔드 ───────────────────────────────────────────────────────

def _gguf_analyze(contract_text: str, law_context: str) -> tuple[str, str]:
    from llama_cpp import Llama
    if GGUF_MODEL_PATH not in _gguf_cache:
        if not os.path.exists(GGUF_MODEL_PATH):
            raise FileNotFoundError(f"GGUF 모델 파일을 찾을 수 없습니다: {GGUF_MODEL_PATH}")
        logger.info(f"GGUF 모델 로딩: {GGUF_MODEL_PATH}")
        _gguf_cache[GGUF_MODEL_PATH] = Llama(model_path=GGUF_MODEL_PATH,
            n_ctx=GGUF_N_CTX, n_gpu_layers=GGUF_N_GPU_LAYERS, verbose=False)
    llm = _gguf_cache[GGUF_MODEL_PATH]
    response = llm.create_chat_completion(
        messages=[{"role": "system", "content": SYSTEM_PROMPT},
                  {"role": "user", "content": build_user_prompt(contract_text, law_context)}],
        max_tokens=4096, temperature=0.1)
    return response["choices"][0]["message"]["content"], os.path.basename(GGUF_MODEL_PATH)


# ── Ollama 백엔드 ─────────────────────────────────────────────────────

def _ollama_chat(messages: list[dict], use_json_format: bool = True) -> str:
    import requests
    payload: dict = {"model": OLLAMA_MODEL, "messages": messages, "stream": False, "options": OLLAMA_OPTIONS}
    if use_json_format:
        payload["format"] = "json"
    logger.info(f"Ollama 호출 | model={OLLAMA_MODEL} | json_format={use_json_format}")
    response = requests.post(f"{OLLAMA_BASE_URL}/api/chat", json=payload, timeout=300)
    response.raise_for_status()
    return response.json()["message"]["content"]

def _ollama_analyze(contract_text: str, law_context: str) -> tuple[str, str]:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_user_prompt(contract_text, law_context)},
    ]
    raw = _ollama_chat(messages)
    logger.info(f"Ollama 응답:\n{raw}")
    return raw, OLLAMA_MODEL

def _ollama_retry_analyze(contract_text: str, law_context: str, error: str) -> tuple[str, str]:
    logger.warning(f"Ollama 응답 형식 오류로 재시도: {error}")
    system = SYSTEM_PROMPT + """

중요: 최상위 키는 is_clean, summary, items 입니다.
items 내부 키는 id, status, law, title, evidence, description, actionLabel 입니다.
JSON 외 텍스트, 마크다운, 코드블록을 출력하지 마세요."""
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": build_user_prompt(contract_text, law_context)},
    ]
    raw = _ollama_chat(messages)
    logger.info(f"Ollama 재시도 응답:\n{raw}")
    return raw, f"{OLLAMA_MODEL}:retry"


# ── vLLM 백엔드 ──────────────────────────────────────────────────────

def _vllm_chat(messages: list[dict], use_json_format: bool = True) -> str:
    import requests
    payload: dict = {
        "model": VLLM_MODEL,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 4096,
        "top_p": 0.8,
    }
    if use_json_format:
        payload["response_format"] = {"type": "json_object"}
    logger.info(f"vLLM 호출 | model={VLLM_MODEL} | json_format={use_json_format}")
    response = requests.post(f"{VLLM_BASE_URL}/v1/chat/completions", json=payload, timeout=300)
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"]

def _vllm_analyze(contract_text: str, law_context: str) -> tuple[str, str]:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": build_user_prompt(contract_text, law_context)},
    ]
    raw = _vllm_chat(messages)
    logger.info(f"vLLM 응답:\n{raw}")
    return raw, VLLM_MODEL

def _vllm_retry_analyze(contract_text: str, law_context: str, error: str) -> tuple[str, str]:
    logger.warning(f"vLLM 응답 형식 오류로 재시도: {error}")
    system = SYSTEM_PROMPT + """

중요: 최상위 키는 is_clean, summary, items 입니다.
items 내부 키는 id, status, law, title, evidence, description, actionLabel 입니다.
JSON 외 텍스트, 마크다운, 코드블록을 출력하지 마세요."""
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": build_user_prompt(contract_text, law_context)},
    ]
    raw = _vllm_chat(messages)
    logger.info(f"vLLM 재시도 응답:\n{raw}")
    return raw, f"{VLLM_MODEL}:retry"


# ── 공통 진입점 ───────────────────────────────────────────────────────

def analyze_contract(contract_text: str, law_context: str = "") -> dict[str, Any]:
    truncated = contract_text[:4000]
    start = time.perf_counter()

    logger.info(f"분석 시작 | backend={MODEL_BACKEND} | text_len={len(truncated)} | rag={'yes' if law_context else 'no'}")

    if MODEL_BACKEND == "gguf":
        raw, model_id = _gguf_analyze(truncated, law_context)
    elif MODEL_BACKEND == "ollama":
        raw, model_id = _ollama_analyze(truncated, law_context)
    elif MODEL_BACKEND == "vllm":
        raw, model_id = _vllm_analyze(truncated, law_context)
    else:
        raw, model_id = _mlx_analyze(truncated, law_context)

    elapsed = round(time.perf_counter() - start, 2)
    logger.info(f"분석 완료 | elapsed={elapsed}s")

    if not raw.strip():
        raise ValueError("모델이 빈 응답을 반환했습니다.")

    try:
        result = _normalize_analysis(_parse_json(raw))
    except ValueError as exc:
        if MODEL_BACKEND == "ollama":
            raw, model_id = _ollama_retry_analyze(truncated, law_context, str(exc))
            try:
                result = _normalize_analysis(_parse_json(raw))
            except ValueError as retry_exc:
                model_id = f"{model_id}:fallback"
                result = _fallback_analysis(truncated, str(retry_exc))
        elif MODEL_BACKEND == "vllm":
            raw, model_id = _vllm_retry_analyze(truncated, law_context, str(exc))
            try:
                result = _normalize_analysis(_parse_json(raw))
            except ValueError as retry_exc:
                model_id = f"{model_id}:fallback"
                result = _fallback_analysis(truncated, str(retry_exc))
        else:
            result = _fallback_analysis(truncated, str(exc))

    logger.info(f"파싱 결과:\n{json.dumps(result, ensure_ascii=False, indent=2)}")
    result["_meta"] = {"backend": MODEL_BACKEND, "model": model_id, "elapsed_sec": elapsed}
    return result

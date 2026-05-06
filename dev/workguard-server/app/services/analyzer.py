from __future__ import annotations

import json
import logging
import os
import re
import time
from typing import Any

from app.prompt import SYSTEM_PROMPT, build_user_prompt

logger = logging.getLogger(__name__)

# MODEL_BACKEND=mlx  → Apple Silicon MLX (기본)
# MODEL_BACKEND=gguf → llama-cpp-python GGUF
MODEL_BACKEND = os.getenv("MODEL_BACKEND", "ollama")

MLX_MODEL = os.getenv("MLX_MODEL", "mlx-community/gemma-4-e4b-it-4bit")
GGUF_MODEL_PATH = os.getenv("GGUF_MODEL_PATH", "./models/model.gguf")
GGUF_N_CTX = int(os.getenv("GGUF_N_CTX", "8192"))
GGUF_N_GPU_LAYERS = int(os.getenv("GGUF_N_GPU_LAYERS", "-1"))
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e4b")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

_mlx_cache: dict[str, tuple] = {}
_gguf_cache: dict[str, Any] = {}

STATUSES = {"위반", "경고", "정상", "확인불가", "violation", "warning", "normal", "unknown"}
STATUS_TO_REPORT = {
    "위반": "violation",
    "경고": "warning",
    "정상": "normal",
    "확인불가": "unknown",
    "violation": "violation",
    "warning": "warning",
    "normal": "normal",
    "unknown": "unknown",
}
ACTION_BY_STATUS = {
    "violation": "신고 방법 보기",
    "warning": "대응 방법 보기",
    "normal": None,
    "unknown": "확인 요청하기",
    "위반": "신고 방법 보기",
    "경고": "대응 방법 보기",
    "정상": None,
    "확인불가": "확인 요청하기",
}
OLLAMA_OPTIONS = {"temperature": 0, "top_p": 0.8, "num_predict": 4096}


# ── JSON 파싱 유틸 ────────────────────────────────────────────────────

def _fix_json(text: str) -> str:
    text = re.sub(r'(\d)"(,)', r'\1\2', text)
    text = re.sub(r'(true|false|null)"(,|})', r'\1\2', text)
    return text


def _strip_fences(text: str) -> str:
    """Remove markdown code fences (```json ... ``` or ``` ... ```)."""
    return re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.DOTALL).strip()


def _parse_json(raw: str) -> dict[str, Any]:
    stripped = _strip_fences(raw)
    candidates = [
        stripped,
        re.search(r"\{.*\}", stripped, re.DOTALL),
    ]
    for candidate in candidates:
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


def _normalize_analysis(result: dict[str, Any]) -> dict[str, Any]:
    """Keep API output aligned with the work-guard-ny analyzer JSON contract."""
    if not isinstance(result, dict):
        raise ValueError("분석 결과는 JSON object여야 합니다.")

    items = result.get("items")
    if not isinstance(items, list) or not items:
        raise ValueError(
            "분석 결과가 예상 JSON 형식이 아닙니다. "
            "is_clean, summary, items 키를 가진 노동법 판정 JSON이어야 합니다."
        )

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
        normalized_items.append(
            {
                "id": len(normalized_items) + 1,
                "status": status,
                "law": law if law not in ("", "null", "None") else None,
                "title": title,
                "evidence": evidence if evidence not in ("", "null", "None") else None,
                "description": description,
                "actionLabel": ACTION_BY_STATUS[status],
            }
        )

    if not normalized_items:
        raise ValueError("분석 결과 items에 유효한 판정 항목이 없습니다.")

    if len(normalized_items) != 10:
        raise ValueError(f"분석 결과 items는 10개여야 합니다: {len(normalized_items)}개")

    counts = {
        "violation": sum(1 for item in normalized_items if item["status"] == "violation"),
        "warning": sum(1 for item in normalized_items if item["status"] == "warning"),
        "normal": sum(1 for item in normalized_items if item["status"] == "normal"),
        "unknown": sum(1 for item in normalized_items if item["status"] == "unknown"),
    }

    return {
        "is_clean": counts["violation"] == 0 and counts["warning"] == 0,
        "summary": counts,
        "items": normalized_items,
    }


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
        if any(keyword in evidence for keyword in keywords):
            try:
                return int(match.group(1).replace(",", "")), evidence
            except ValueError:
                continue
    return None, None


def _is_missing_near(text: str, keyword: str, window: int = 30) -> bool:
    for match in re.finditer(re.escape(keyword), text):
        start = max(0, match.start() - window)
        end = min(len(text), match.end() + window)
        nearby = text[start:end]
        if _has_any(nearby, ("미기재", "명시되지 않음", "내용 없음", "없음", "null")):
            return True
    return False


def _fallback_analysis(contract_text: str, reason: str) -> dict[str, Any]:
    """Deterministic safety net when a small local model ignores the JSON contract."""
    logger.warning(f"LLM JSON 형식 복구 실패, fallback 분석 사용: {reason}")
    text = re.sub(r"\s+", " ", contract_text)
    amounts = _amounts(text)

    items: list[dict[str, Any]] = []

    monthly_wage, monthly_evidence = _find_money_evidence(
        text,
        ("월급", "월 임금", "월임금", "월급여", "기본급", "월(일", "월 (일", "월 시간", "임금"),
    )
    hourly_wage, hourly_evidence = _find_money_evidence(text, ("시급", "시간급"))
    if monthly_wage is None and _has_any(text, ("월급", "월 임금", "월임금", "월급여", "기본급", "월(일", "임금")) and amounts:
        monthly_wage = max(amounts)
        monthly_evidence = f"{monthly_wage:,}원"
    if hourly_wage is None and _has_any(text, ("시급", "시간급")) and amounts:
        hourly_wage = min(amounts)
        hourly_evidence = f"{hourly_wage:,}원"

    if monthly_wage is not None:
        if monthly_wage < 2_096_270:
            items.append({
                "status": "위반",
                "law": "최저임금법 제6조",
                "title": "최저임금 미달",
                "evidence": monthly_evidence,
                "detail": f"명시된 월급 {monthly_wage:,}원은 2026년 최저임금 기준 월 2,096,270원에 미달합니다.",
                "action": ACTION_BY_STATUS["위반"],
            })
        else:
            items.append({
                "status": "정상",
                "law": "최저임금법 제6조",
                "title": "최저임금 충족",
                "evidence": monthly_evidence,
                "detail": f"명시된 월급 {monthly_wage:,}원은 2026년 최저임금 기준 이상입니다.",
                "action": ACTION_BY_STATUS["정상"],
            })
    elif hourly_wage is not None:
        status = "위반" if hourly_wage < 10_030 else "정상"
        items.append({
            "status": status,
            "law": "최저임금법 제6조",
            "title": "최저임금 미달" if status == "위반" else "최저임금 충족",
            "evidence": hourly_evidence,
            "detail": f"명시된 시급 {hourly_wage:,}원은 2026년 최저임금 기준 시급 10,030원{'에 미달합니다' if status == '위반' else ' 이상입니다'}.",
            "action": ACTION_BY_STATUS[status],
        })
    else:
        items.append({
            "status": "경고",
            "law": "최저임금법 제6조",
            "title": "임금 정보 없음",
            "detail": "임금 금액이 명확히 확인되지 않아 최저임금 충족 여부를 판단할 수 없습니다. 근로계약서의 핵심 근로조건 보완이 필요합니다.",
            "action": ACTION_BY_STATUS["경고"],
        })

    if re.search(r"\d{1,2}\s*:\s*\d{2}\s*[~-]\s*\d{1,2}\s*:\s*\d{2}", text) or _has_any(text, ("근로시간", "근무시간")):
        items.append({
            "status": "경고",
            "law": "근로기준법 제50·53조",
            "title": "근로시간 확인 필요",
            "detail": "근로시간 문구는 확인되지만 휴게시간과 주당 총 근로시간 산정이 명확하지 않아 주 52시간 준수 여부 확인이 필요합니다.",
            "action": ACTION_BY_STATUS["경고"],
        })
    else:
        items.append({
            "status": "경고",
            "law": "근로기준법 제50·53조",
            "title": "근로시간 미명시",
            "detail": "근로시간 관련 내용이 없어 법정 근로시간 준수 여부를 판단할 수 없습니다. 근로계약서의 핵심 근로조건 보완이 필요합니다.",
            "action": ACTION_BY_STATUS["경고"],
        })

    if _has_any(text, ("연장수당", "야간수당", "휴일수당", "가산수당", "포괄임금", "고정")):
        items.append({
            "status": "경고",
            "law": "근로기준법 제56조",
            "title": "가산수당 확인 필요",
            "detail": "수당 관련 문구가 있으나 실제 근로시간에 따른 법정 가산수당 충족 여부 확인이 필요합니다.",
            "action": ACTION_BY_STATUS["경고"],
        })
    else:
        items.append({
            "status": "확인불가",
            "law": "근로기준법 제56조",
            "title": "가산수당 미명시",
            "detail": "연장·야간·휴일근로 가산수당 관련 내용이 없어 판단할 수 없습니다.",
            "action": ACTION_BY_STATUS["확인불가"],
        })

    annual_status = "정상" if _has_any(text, ("연차", "유급휴가")) and not _is_missing_near(text, "연차") else "확인불가"
    items.append({
        "status": annual_status,
        "law": "근로기준법 제60조",
        "title": "연차유급휴가 부여" if annual_status == "정상" else "연차 미명시",
        "detail": "연차 또는 유급휴가 관련 문구가 확인됩니다." if annual_status == "정상" else "연차 관련 내용이 없어 판단할 수 없습니다.",
        "action": ACTION_BY_STATUS[annual_status],
    })

    retirement_status = "정상" if _has_any(text, ("퇴직금", "퇴직급여")) and not _is_missing_near(text, "퇴직") else "확인불가"
    items.append({
        "status": retirement_status,
        "law": "근로자퇴직급여 보장법 제8조",
        "title": "퇴직금 지급 명시" if retirement_status == "정상" else "퇴직금 미명시",
        "detail": "퇴직금 관련 문구가 확인됩니다." if retirement_status == "정상" else "퇴직금 관련 내용이 없어 판단할 수 없습니다.",
        "action": ACTION_BY_STATUS[retirement_status],
    })

    dismissal_status = "정상" if _has_any(text, ("해고", "30일 전", "해고예고")) and not _is_missing_near(text, "해고") else "확인불가"
    items.append({
        "status": dismissal_status,
        "law": "근로기준법 제26조",
        "title": "해고예고 명시" if dismissal_status == "정상" else "해고예고 미명시",
        "detail": "해고예고 관련 문구가 확인됩니다." if dismissal_status == "정상" else "해고예고 관련 내용이 없어 판단할 수 없습니다.",
        "action": ACTION_BY_STATUS[dismissal_status],
    })

    payday_status = "정상" if re.search(r"매월\s*\d{1,2}\s*일", text) or _has_any(text, ("지급일", "급여일")) else "경고"
    items.append({
        "status": payday_status,
        "law": "근로기준법 제43조",
        "title": "임금 지급일 명시" if payday_status == "정상" else "임금 지급일 미명시",
        "detail": "임금 지급일 관련 문구가 확인됩니다." if payday_status == "정상" else "임금 지급일 관련 내용이 없어 임금 정기 지급 원칙 준수 여부 확인이 필요합니다.",
        "action": ACTION_BY_STATUS[payday_status],
    })

    comprehensive_status = "경고" if _has_any(text, ("포괄임금", "고정 연장", "고정수당", "고정 지급")) else "확인불가"
    items.append({
        "status": comprehensive_status,
        "law": "근로기준법 제56조",
        "title": "포괄임금제 확인 필요" if comprehensive_status == "경고" else "포괄임금제 여부 없음",
        "detail": "포괄임금 또는 고정수당 관련 문구가 있어 실제 법정 수당 충족 여부 확인이 필요합니다." if comprehensive_status == "경고" else "포괄임금제 관련 내용이 없어 별도 판단이 어렵습니다.",
        "action": ACTION_BY_STATUS[comprehensive_status],
    })

    penalty_status = "위반" if _has_any(text, ("위약금", "손해배상액", "임금에서 공제", "손해배상 예정")) else "정상"
    items.append({
        "status": penalty_status,
        "law": "근로기준법 제20조",
        "title": "손해배상·위약금 조항 존재" if penalty_status == "위반" else "손해배상·위약금 조항 없음",
        "detail": "위약금 또는 손해배상 예정·임금 공제 조항이 확인되어 근로기준법 위반 소지가 있습니다." if penalty_status == "위반" else "위약금 또는 손해배상 예정 조항이 확인되지 않습니다.",
        "action": ACTION_BY_STATUS[penalty_status],
    })

    probation_status = "경고" if _has_any(text, ("수습", "시용")) else "확인불가"
    items.append({
        "status": probation_status,
        "law": "최저임금법 제5조",
        "title": "수습기간 확인 필요" if probation_status == "경고" else "수습기간 정보 없음",
        "detail": "수습기간 관련 문구가 있어 기간과 임금 감액 기준 확인이 필요합니다." if probation_status == "경고" else "수습기간 및 감액 관련 내용이 없어 판단할 수 없습니다.",
        "action": ACTION_BY_STATUS[probation_status],
    })

    return _normalize_analysis({"items": items})


def _evidence_near(text: str, keywords: tuple[str, ...], window: int = 55) -> str | None:
    for keyword in keywords:
        match = re.search(re.escape(keyword), text)
        if match:
            start = max(0, match.start() - window)
            end = min(len(text), match.end() + window)
            return text[start:end].strip(" .,\n\t")
    return None


def _fallback_analysis(contract_text: str, reason: str) -> dict[str, Any]:
    """Build a fixed 12-item report when the model omits checklist items."""
    logger.warning(f"LLM JSON 형식 복구 실패, 10개 체크리스트 fallback 분석 사용: {reason}")
    text = re.sub(r"\s+", " ", contract_text)
    amounts = _amounts(text)

    def item(
        id_: int,
        status: str,
        law: str | None,
        title: str,
        evidence: str | None,
        description: str,
    ) -> dict[str, Any]:
        return {
            "id": id_,
            "status": status,
            "law": law,
            "title": title,
            "evidence": evidence,
            "description": description,
            "actionLabel": ACTION_BY_STATUS[status],
        }

    monthly_wage, monthly_evidence = _find_money_evidence(
        text,
        ("월급", "월 임금", "월임금", "월급여", "기본급", "월(일", "월 (일", "월 시간", "임금"),
    )
    hourly_wage, hourly_evidence = _find_money_evidence(text, ("시급", "시간급"))
    if monthly_wage is None and _has_any(text, ("월급", "월 임금", "월임금", "월급여", "기본급", "월(일", "임금")) and amounts:
        monthly_wage = max(amounts)
        monthly_evidence = _evidence_near(text, ("월급", "월(일", "임금", f"{monthly_wage:,}원")) or f"{monthly_wage:,}원"
    if hourly_wage is None and _has_any(text, ("시급", "시간급")) and amounts:
        hourly_wage = min(amounts)
        hourly_evidence = _evidence_near(text, ("시급", "시간급", f"{hourly_wage:,}원")) or f"{hourly_wage:,}원"

    items: list[dict[str, Any]] = []

    period_evidence = _evidence_near(text, ("근로계약기간", "계약기간", "계약 기간", "부터", "까지"))
    period_status = "normal" if period_evidence and not _is_missing_near(text, "기간") else "warning"
    items.append(item(
        1,
        period_status,
        None,
        "근로계약 기간",
        period_evidence,
        "근로계약 기간 관련 문구가 확인됩니다." if period_status == "normal" else "근로계약 시작일 또는 종료일이 명확하지 않아 보완이 필요합니다.",
    ))

    duty_evidence = _evidence_near(text, ("업무장소", "근무장소", "장소", "업무내용", "담당업무", "종사"))
    duty_status = "normal" if duty_evidence and not (_is_missing_near(text, "장소") or _is_missing_near(text, "업무")) else "warning"
    items.append(item(
        2,
        duty_status,
        "근로기준법 시행령 제8조",
        "업무 내용 및 근무 장소",
        duty_evidence,
        "업무 내용과 근무 장소가 확인됩니다." if duty_status == "normal" else "업무 내용 또는 근무 장소가 명확하지 않아 보완이 필요합니다.",
    ))

    time_evidence = _evidence_near(text, ("근로시간", "근무시간", "휴게시간", "휴게 시간", "시 00분", "주 5일"))
    time_status = "normal" if time_evidence and _has_any(text, ("휴게", "12시", "13시")) else "warning"
    items.append(item(
        3,
        time_status,
        "근로기준법 제50·53조",
        "근로일, 근로시간, 휴게시간",
        time_evidence,
        "근로시간과 휴게시간 관련 문구가 확인됩니다." if time_status == "normal" else "근로시간 또는 휴게시간 산정이 명확하지 않아 주 52시간 준수 여부 확인이 필요합니다.",
    ))

    if monthly_wage is not None:
        wage_status = "violation" if monthly_wage < 2_096_270 else "normal"
        wage_desc = (
            f"명시된 월급 {monthly_wage:,}원은 2026년 최저임금 기준 월 2,096,270원에 미달합니다."
            if wage_status == "violation"
            else f"명시된 월급 {monthly_wage:,}원은 2026년 최저임금 기준 이상입니다."
        )
        wage_evidence = monthly_evidence
    elif hourly_wage is not None:
        wage_status = "violation" if hourly_wage < 10_030 else "normal"
        wage_desc = (
            f"명시된 시급 {hourly_wage:,}원은 2026년 최저임금 기준 시급 10,030원에 미달합니다."
            if wage_status == "violation"
            else f"명시된 시급 {hourly_wage:,}원은 2026년 최저임금 기준 이상입니다."
        )
        wage_evidence = hourly_evidence
    else:
        wage_status = "warning"
        wage_desc = "임금 금액, 구성항목 또는 산정 기준이 명확하지 않아 최저임금 충족 여부를 판단하기 어렵습니다."
        wage_evidence = _evidence_near(text, ("임금", "급여", "기본급", "수당"))
    items.append(item(4, wage_status, "최저임금법 제6조", "임금 구성, 금액, 산정 기준", wage_evidence, wage_desc))

    pay_evidence = _evidence_near(text, ("지급일", "지급 일", "매월", "계좌", "현금", "이체"))
    pay_status = "normal" if pay_evidence and not _is_missing_near(text, "지급") else "warning"
    items.append(item(
        5,
        pay_status,
        "근로기준법 제43조",
        "임금 지급일, 지급 방법",
        pay_evidence,
        "임금 지급일 또는 지급 방법이 확인됩니다." if pay_status == "normal" else "임금 지급일 또는 지급 방법이 명확하지 않아 보완이 필요합니다.",
    ))

    leave_evidence = _evidence_near(text, ("휴일", "주휴", "연차", "유급휴가"))
    leave_status = "normal" if leave_evidence and not (_is_missing_near(text, "연차") or _is_missing_near(text, "휴일")) else "unknown"
    items.append(item(
        6,
        leave_status,
        "근로기준법 제55·60조",
        "휴일, 주휴일, 연차유급휴가",
        leave_evidence,
        "휴일 또는 연차유급휴가 관련 문구가 확인됩니다." if leave_status == "normal" else "휴일, 주휴일 또는 연차유급휴가 관련 내용이 없어 판단할 수 없습니다.",
    ))

    overtime_evidence = _evidence_near(text, ("연장", "야간", "휴일근로", "가산수당", "포괄임금", "고정"))
    if overtime_evidence and _has_any(overtime_evidence, ("미지급", "지급하지 않음", "없음")):
        overtime_status = "violation"
    elif overtime_evidence:
        overtime_status = "warning" if _has_any(overtime_evidence, ("고정", "포괄", "300,000")) else "normal"
    else:
        overtime_status = "unknown"
    items.append(item(
        7,
        overtime_status,
        "근로기준법 제56조",
        "연장·야간·휴일근로 및 가산수당",
        overtime_evidence,
        "연장·야간·휴일근로 수당 관련 문구의 법정 가산수당 충족 여부 확인이 필요합니다." if overtime_status == "warning" else (
            "가산수당 미지급 조항은 법 위반 소지가 있습니다." if overtime_status == "violation" else (
                "가산수당 지급 기준이 확인됩니다." if overtime_status == "normal" else "연장·야간·휴일근로 및 가산수당 관련 내용이 없어 판단할 수 없습니다."
            )
        ),
    ))

    retirement_evidence = _evidence_near(text, ("퇴직금", "퇴직급여"))
    retirement_status = "normal" if retirement_evidence and not _is_missing_near(text, "퇴직") else "unknown"
    items.append(item(
        8,
        retirement_status,
        "근로자퇴직급여 보장법 제8조",
        "퇴직금/퇴직급여",
        retirement_evidence,
        "퇴직금 또는 퇴직급여 관련 문구가 확인됩니다." if retirement_status == "normal" else "퇴직금 또는 퇴직급여 관련 내용이 없어 판단할 수 없습니다.",
    ))

    termination_evidence = _evidence_near(text, ("해고", "퇴직", "계약 해지", "해지", "30일 전"))
    termination_status = "normal" if termination_evidence and not _is_missing_near(text, "해고") else "unknown"
    items.append(item(
        9,
        termination_status,
        "근로기준법 제26조",
        "계약 해지, 퇴직, 해고예고",
        termination_evidence,
        "계약 해지, 퇴직 또는 해고예고 관련 문구가 확인됩니다." if termination_status == "normal" else "계약 해지, 퇴직 또는 해고예고 관련 내용이 없어 판단할 수 없습니다.",
    ))

    damage_evidence = _evidence_near(text, ("위약금", "손해배상", "손해 배상", "임금에서 공제", "공제를 함", "공제함"))
    damage_status = "violation" if damage_evidence else "normal"
    items.append(item(
        10,
        damage_status,
        "근로기준법 제20조",
        "손해배상, 위약금, 임금 공제",
        damage_evidence,
        "손해배상액 예정 또는 임금 공제 조항이 확인되어 근로기준법 위반 소지가 있습니다." if damage_status == "violation" else "손해배상 예정, 위약금 또는 임금 공제 조항은 확인되지 않습니다.",
    ))

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
            raise FileNotFoundError(
                f"GGUF 모델 파일을 찾을 수 없습니다: {GGUF_MODEL_PATH}\n"
                "GGUF_MODEL_PATH 환경변수를 확인하거나 모델 파일을 다운로드하세요."
            )
        logger.info(f"GGUF 모델 로딩: {GGUF_MODEL_PATH}")
        _gguf_cache[GGUF_MODEL_PATH] = Llama(
            model_path=GGUF_MODEL_PATH,
            n_ctx=GGUF_N_CTX,
            n_gpu_layers=GGUF_N_GPU_LAYERS,
            verbose=False,
        )

    llm = _gguf_cache[GGUF_MODEL_PATH]
    response = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_user_prompt(contract_text, law_context)},
        ],
        max_tokens=4096,
        temperature=0.1,
    )
    raw = response["choices"][0]["message"]["content"]
    return raw, os.path.basename(GGUF_MODEL_PATH)


# ── Ollama 백엔드 ─────────────────────────────────────────────────────

def _ollama_chat(messages: list[dict], use_json_format: bool = True) -> str:
    import requests

    payload: dict = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": OLLAMA_OPTIONS,
    }
    if use_json_format:
        payload["format"] = "json"

    logger.info(f"Ollama 호출 | endpoint=/api/chat | messages={len(messages)} | json_format={use_json_format}")
    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/chat",
        json=payload,
        timeout=300,
    )
    response.raise_for_status()
    return response.json()["message"]["content"]


def _ollama_analyze(contract_text: str, law_context: str) -> tuple[str, str]:
    logger.info(f"Ollama 모델 사용: {OLLAMA_MODEL}")
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

중요: 지금 작업은 계약서 정보 추출이 아닙니다.
document_type, parties, employment_details, clauses, contract_clauses, analysis 키를 만들면 실패입니다.
최상위 키는 is_clean, summary, items 입니다.
items 내부 키는 id, status, law, title, evidence, description, actionLabel 입니다.
JSON 외 텍스트, 마크다운, 코드블록을 출력하지 마세요."""
    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": build_user_prompt(contract_text, law_context)},
    ]
    raw = _ollama_chat(messages)
    logger.info(f"Ollama 재시도 응답:\n{raw}")
    return raw, f"{OLLAMA_MODEL}:retry"


# ── 공통 진입점 ───────────────────────────────────────────────────────

def analyze_contract(
    contract_text: str,
    law_context: str = "",
) -> dict[str, Any]:
    """
    계약서 텍스트를 LLM으로 분석한다.
    MODEL_BACKEND 환경변수로 mlx / gguf 선택.
    """
    truncated = contract_text[:4000]
    start = time.perf_counter()

    logger.info(
        f"분석 시작 | backend={MODEL_BACKEND} | text_len={len(truncated)} | rag={'yes' if law_context else 'no'}"
    )

    if MODEL_BACKEND == "gguf":
        raw, model_id = _gguf_analyze(truncated, law_context)
    elif MODEL_BACKEND == "ollama":
        raw, model_id = _ollama_analyze(truncated, law_context)
    else:
        raw, model_id = _mlx_analyze(truncated, law_context)

    elapsed = round(time.perf_counter() - start, 2)
    logger.info(f"분석 완료 | elapsed={elapsed}s")

    if not raw.strip():
        raise ValueError("모델이 빈 응답을 반환했습니다.")

    try:
        result = _normalize_analysis(_parse_json(raw))
    except ValueError as exc:
        if MODEL_BACKEND != "ollama":
            raise
        raw, model_id = _ollama_retry_analyze(truncated, law_context, str(exc))
        try:
            result = _normalize_analysis(_parse_json(raw))
        except ValueError as retry_exc:
            model_id = f"{model_id}:fallback"
            result = _fallback_analysis(truncated, str(retry_exc))
    logger.info(f"파싱 결과:\n{json.dumps(result, ensure_ascii=False, indent=2)}")
    result["_meta"] = {
        "backend": MODEL_BACKEND,
        "model": model_id,
        "elapsed_sec": elapsed,
    }
    return result

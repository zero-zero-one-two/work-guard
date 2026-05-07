from __future__ import annotations

import os
from pathlib import Path
from typing import Any, BinaryIO

import requests

_UPSTAGE_URL = "https://api.upstage.ai/v1/document-digitization"
_TIMEOUT = int(os.getenv("OCR_TIMEOUT", "120"))


class OcrError(RuntimeError):
    pass


def call_ocr(file: BinaryIO, filename: str) -> str:
    """파일 객체를 Upstage OCR에 보내고 추출된 텍스트를 반환한다."""
    api_key = os.getenv("UPSTAGE_API_KEY", "")
    if not api_key:
        raise OcrError("UPSTAGE_API_KEY 환경변수가 필요합니다.")

    response = requests.post(
        _UPSTAGE_URL,
        headers={"Authorization": f"Bearer {api_key}"},
        files={"document": (filename, file)},
        data={"model": "ocr"},
        timeout=_TIMEOUT,
    )

    if response.status_code >= 400:
        raise OcrError(f"OCR 실패: {response.status_code} {response.text}")

    data: dict[str, Any] = response.json()
    return _extract_text(data)


def _extract_text(data: dict[str, Any]) -> str:
    pages = data.get("pages", [])
    parts: list[str] = []
    for page in pages:
        text = str(page.get("text", "")).strip()
        if not text:
            continue
        page_no = page.get("page")
        prefix = f"[page {page_no}]\n" if page_no is not None and len(pages) > 1 else ""
        parts.append(f"{prefix}{text}")
    return "\n\n".join(parts).strip()

from __future__ import annotations

import json
import shutil
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, BinaryIO
from uuid import uuid4

import requests

from src.ocr.settings import ocr_settings


UPSTAGE_DOCUMENT_DIGITIZATION_URL = "https://api.upstage.ai/v1/document-digitization"


class OcrError(RuntimeError):
    """Raised when OCR extraction fails."""


@dataclass(frozen=True)
class OcrResult:
    document_id: str
    original_path: Path
    json_path: Path
    text_path: Path
    text: str
    raw_response: dict[str, Any]


def _require_api_key() -> str:
    if not ocr_settings.upstage_api_key:
        raise OcrError("UPSTAGE_API_KEY 환경변수가 필요합니다.")
    return ocr_settings.upstage_api_key


def _safe_suffix(filename: str) -> str:
    suffix = Path(filename).suffix.lower()
    return suffix if suffix else ".bin"


def save_upload(file_obj: BinaryIO, filename: str) -> tuple[str, Path]:
    raw_dir = Path(ocr_settings.raw_dir)
    raw_dir.mkdir(parents=True, exist_ok=True)

    document_id = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid4().hex[:8]}"
    upload_path = raw_dir / f"{document_id}{_safe_suffix(filename)}"

    with upload_path.open("wb") as out:
        shutil.copyfileobj(file_obj, out)

    return document_id, upload_path


def call_upstage_ocr(file_path: Path) -> dict[str, Any]:
    api_key = _require_api_key()

    with file_path.open("rb") as document:
        response = requests.post(
            UPSTAGE_DOCUMENT_DIGITIZATION_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            files={"document": (file_path.name, document)},
            data={"model": "ocr"},
            timeout=ocr_settings.request_timeout,
        )

    if response.status_code >= 400:
        raise OcrError(f"Upstage OCR 실패: {response.status_code} {response.text}")

    try:
        return response.json()
    except ValueError as exc:
        raise OcrError("Upstage OCR 응답이 JSON이 아닙니다.") from exc


def extract_text(ocr_response: dict[str, Any]) -> str:
    pages = ocr_response.get("pages", [])
    page_texts: list[str] = []

    for page in pages:
        text = str(page.get("text", "")).strip()
        if not text:
            continue

        page_no = page.get("page")
        prefix = f"[page {page_no}]\n" if page_no is not None and len(pages) > 1 else ""
        page_texts.append(f"{prefix}{text}".strip())

    return "\n\n".join(page_texts).strip()


def persist_ocr_result(
    document_id: str,
    original_path: Path,
    ocr_response: dict[str, Any],
) -> OcrResult:
    result_dir = Path(ocr_settings.result_dir)
    result_dir.mkdir(parents=True, exist_ok=True)

    text = extract_text(ocr_response)
    json_path = result_dir / f"{document_id}.json"
    text_path = result_dir / f"{document_id}.txt"

    json_path.write_text(
        json.dumps(ocr_response, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    text_path.write_text(text, encoding="utf-8")

    return OcrResult(
        document_id=document_id,
        original_path=original_path,
        json_path=json_path,
        text_path=text_path,
        text=text,
        raw_response=ocr_response,
    )


def run_ocr(file_obj: BinaryIO, filename: str) -> OcrResult:
    document_id, upload_path = save_upload(file_obj, filename)
    response = call_upstage_ocr(upload_path)
    return persist_ocr_result(document_id, upload_path, response)

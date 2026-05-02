from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class OcrSettings:
    upstage_api_key: str = os.getenv("UPSTAGE_API_KEY", "")
    raw_dir: str = os.getenv("OCR_RAW_DIR", "./uploads/ocr")
    result_dir: str = os.getenv("OCR_RESULT_DIR", "./ocr_results")
    request_timeout: int = int(os.getenv("OCR_REQUEST_TIMEOUT", "120"))


ocr_settings = OcrSettings()

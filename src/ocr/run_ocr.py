from __future__ import annotations

import argparse
from pathlib import Path

from src.ocr.service import OcrError, call_upstage_ocr, persist_ocr_result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Upstage OCR for one local file.")
    parser.add_argument("file", type=Path, help="OCR 대상 이미지/PDF 경로")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    file_path = args.file

    if not file_path.exists():
        raise SystemExit(f"파일을 찾을 수 없습니다: {file_path}")

    try:
        response = call_upstage_ocr(file_path)
        result = persist_ocr_result(file_path.stem, file_path, response)
    except OcrError as exc:
        raise SystemExit(str(exc)) from exc

    print(f"텍스트 저장: {result.text_path}")
    print(f"JSON 저장: {result.json_path}")
    print()
    print(result.text[:1000])


if __name__ == "__main__":
    main()

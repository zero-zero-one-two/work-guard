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
MODEL_BACKEND = os.getenv("MODEL_BACKEND", "mlx")

MLX_MODEL = os.getenv("MLX_MODEL", "mlx-community/gemma-4-e4b-it-4bit")
GGUF_MODEL_PATH = os.getenv("GGUF_MODEL_PATH", "./models/model.gguf")
GGUF_N_CTX = int(os.getenv("GGUF_N_CTX", "8192"))
GGUF_N_GPU_LAYERS = int(os.getenv("GGUF_N_GPU_LAYERS", "-1"))  # -1 = 전부 GPU

_mlx_cache: dict[str, tuple] = {}
_gguf_cache: dict[str, Any] = {}


# ── JSON 파싱 유틸 ────────────────────────────────────────────────────

def _fix_json(text: str) -> str:
    text = re.sub(r'(\d)"(,)', r'\1\2', text)
    text = re.sub(r'(true|false|null)"(,|})', r'\1\2', text)
    return text


def _parse_json(raw: str) -> dict[str, Any]:
    for candidate in [
        raw.strip(),
        re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL),
        re.search(r"\{.*\}", raw, re.DOTALL),
    ]:
        text = candidate.group(1) if hasattr(candidate, "group") else candidate
        if not text:
            continue
        try:
            return json.loads(_fix_json(text))
        except (json.JSONDecodeError, TypeError):
            continue
    raise ValueError(f"JSON을 파싱할 수 없습니다: {raw[:300]}")


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
    else:
        raw, model_id = _mlx_analyze(truncated, law_context)

    elapsed = round(time.perf_counter() - start, 2)
    logger.info(f"분석 완료 | elapsed={elapsed}s")

    if not raw.strip():
        raise ValueError("모델이 빈 응답을 반환했습니다.")

    result = _parse_json(raw)
    result["_meta"] = {
        "backend": MODEL_BACKEND,
        "model": model_id,
        "elapsed_sec": elapsed,
    }
    return result

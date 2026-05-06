FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 (fastembed ONNX 런타임 필요)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# GGUF 사용 시 llama-cpp-python 추가 설치
# RUN pip install --no-cache-dir llama-cpp-python

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

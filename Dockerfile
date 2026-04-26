FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt


COPY config.py .
COPY src/ ./src/
COPY main.py .

VOLUME ["/app/documents"]

EXPOSE 8000

CMD ["python", "main.py"]

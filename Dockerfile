FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN chmod +x docker-entrypoint.sh
# Чтобы alembic/uvicorn из любого окружения видели пакет app
ENV PYTHONPATH=/app
ENTRYPOINT ["./docker-entrypoint.sh"]
# ${PORT} — требование Render (по умолчанию 10000); локально и в Docker используем 8000
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

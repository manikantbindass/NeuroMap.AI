FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements-lock.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip==26.2.2 && pip install --no-cache-dir -r /tmp/requirements.txt
COPY backend backend
COPY ml ml
COPY alembic.ini .
RUN useradd --create-home --uid 10001 neuromap && mkdir /app/data && chown neuromap:neuromap /app/data
USER neuromap
EXPOSE 8000
CMD ["sh","-c","python -m alembic upgrade head && python -m uvicorn backend.app.main:create_app --factory --host 0.0.0.0 --port 8000 --no-access-log"]

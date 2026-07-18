FROM python:3.12-slim AS base

ARG UV_VERSION=0.10.0

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_PROJECT_ENVIRONMENT=/usr/local

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir "uv==${UV_VERSION}"

WORKDIR /workspace/apps/api

FROM base AS dev
COPY README.md /workspace/README.md
COPY apps/api /workspace/apps/api
RUN uv sync --project /workspace/apps/api --extra dev --frozen
ENV PYTHONPATH=/workspace/apps/api/src
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM base AS runtime-dependencies
COPY README.md /workspace/README.md
COPY apps/api /workspace/apps/api
RUN uv sync --project /workspace/apps/api --frozen

FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system appgroup \
    && adduser --system --ingroup appgroup appuser

WORKDIR /workspace/apps/api
COPY --from=runtime-dependencies /usr/local /usr/local
COPY README.md /workspace/README.md
COPY apps/api /workspace/apps/api
RUN chown -R appuser:appgroup /workspace/apps/api
USER appuser
ENV PYTHONPATH=/workspace/apps/api/src
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

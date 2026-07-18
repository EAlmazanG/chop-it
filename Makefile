.PHONY: up down reset-demo compose-check api-test web-test test lint typecheck

up:
	docker compose up --build

down:
	docker compose down

reset-demo:
	docker compose down --volumes
	docker compose up --build

compose-check:
	docker compose --env-file .env.example config --quiet

api-test:
	cd apps/api && uv run pytest

web-test:
	pnpm --dir apps/web test --runInBand

test: api-test web-test

lint:
	cd apps/api && uv run ruff check .
	pnpm --dir apps/web lint

typecheck:
	cd apps/api && uv run mypy src
	pnpm --dir apps/web typecheck

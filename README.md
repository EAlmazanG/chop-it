# Chop It!

Chop It is a self-contained meal-planning application for managing ingredients, composing recipes,
planning a week, calculating nutrition totals, and turning the plan into a practical shopping list.

The repository is intentionally ready to explore: it starts with fictional demo data and uses one
local profile. There is no sign-in or account switching in this portfolio edition.

## Quick start

Requirements: Docker with Docker Compose.

```bash
cp .env.example .env
docker compose up --build
```

Open:

- Web application: <http://localhost:3000>
- Interactive API documentation: <http://localhost:8000/docs>
- API health check: <http://localhost:8000/api/v1/health>

The first startup creates the database schema and inserts an idempotent fictional dataset. Postgres
data is kept in a named volume between restarts.

## Product flows

- Maintain nutrition-aware ingredient categories and ingredients.
- Build recipes and calculate total and per-serving macros.
- Plan breakfast, snacks, lunch, and dinner across a week.
- Select plan days and generate a consolidated shopping list.
- Exclude recipes, subtract pantry quantities, tick purchases, and archive completed lists.

## Architecture

```text
Browser → Next.js web → FastAPI → PostgreSQL
                           ↑
                  Alembic migration + demo seed
```

- `apps/web`: Next.js 15, React 19, TypeScript, Tailwind CSS and Jest.
- `apps/api`: FastAPI, Pydantic, SQLAlchemy, Alembic, PostgreSQL and pytest.
- `compose.yaml`: database, one-shot migration/seed, API and web orchestration.

The web uses server actions and server-side API calls, so the API service remains a clear boundary
without duplicating business rules in the UI. Nutrition and shopping-list calculations live in the
backend domain and application layers.

## Useful commands

```bash
make up             # build and start the complete stack
make down           # stop containers
make reset-demo     # remove the data volume and start from the demo seed again
make test           # API and web tests
make lint           # backend and frontend lint
make typecheck      # mypy and TypeScript checks
make compose-check  # validate the Compose model
```

## Local development without rebuilding

The container workflow is the supported quick start. If Python 3.12, uv, Node 22 and pnpm 11 are
already installed, each app can also be run directly from its own directory. Configure
`DATABASE_URL` and `API_INTERNAL_URL` using `.env.example` as a reference.

## Demo boundary

This edition is deliberately single-user. It preserves ownership and audit fields internally but
resolves every request to the same seeded local profile. Do not expose it as a multi-user hosted
service without adding authentication, authorization and an appropriate deployment threat model.

All included example meals, quantities and nutrition values are fictional demo content and should
not be treated as dietary advice.

## License

MIT. See [LICENSE](LICENSE).

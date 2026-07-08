.PHONY: dev test lint build deploy clean

# ── Development ───────────────────────────────────────────
dev:
	docker-compose up --build

dev-stop:
	docker-compose down

# ── Testing ───────────────────────────────────────────────
test:
	python -m pytest tests/ -v --tb=short

test-cov:
	python -m pytest tests/ -v --tb=short --cov=app --cov-report=term-missing

# ── Linting ───────────────────────────────────────────────
lint:
	ruff check app/ tests/
	cd frontend && bun run lint

# ── Build ─────────────────────────────────────────────────
build:
	docker-compose build

build-prod:
	docker-compose -f docker-compose.prod.yml build

# ── Deploy ────────────────────────────────────────────────
deploy:
	docker-compose -f docker-compose.prod.yml up -d --build

deploy-stop:
	docker-compose -f docker-compose.prod.yml down

# ── Clean ─────────────────────────────────────────────────
clean:
	docker-compose down -v
	docker system prune -f
	rm -rf app/logs/*.jsonl
	rm -rf app/uploads/cars/*
	rm -rf frontend/.output
	rm -rf frontend/node_modules

# ── Database ──────────────────────────────────────────────
db-reset:
	docker-compose down -v
	docker-compose up -d db
	sleep 5
	python -m alembic upgrade head
	python -m app.seed

# ── Migrations ────────────────────────────────────────────
migrate:
	python -m alembic upgrade head

migration:
	python -m alembic revision --autogenerate -m "$(msg)"

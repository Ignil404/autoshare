# AutoShare

Платформа каршеринга. FastAPI + PostgreSQL бэкенд, React/TypeScript фронтенд.

## Запуск

```bash
docker-compose up --build
```

- **API**: http://localhost:8000
- **Frontend**: http://localhost:80
- **Health**: http://localhost:8000/health

Для запуска бэкенда локально без Docker:

```bash
pip install -r requirements.txt
alembic upgrade head
python3 -m app.seed
uvicorn app.main:app --reload
```

## Тесты

```bash
python3 -m pytest tests/ -v
```

## Структура проекта

```
app/
  api/v1/          # REST endpoints (auth, bookings, rentals, cars, ...)
  core/            # config, database, security, dependencies
  models/          # SQLAlchemy models (12 таблиц)
  schemas/         # Pydantic response schemas
  services/        # audit, booking expirer
  main.py          # FastAPI entry point
  seed.py          # DB seeding (admin + demo data)
alembic/           # Database migrations
frontend/          # React + TanStack Start + shadcn/ui
tests/             # pytest test suite
```

## Тестовые аккаунты

После запуска `python3 -m app.seed` создаются:

**Клиенты:**
| Email | Пароль | Статус |
|-------|--------|--------|
| ivan@test.by | secret123 | ACTIVE |
| maria@test.by | secret123 | ACTIVE |
| petr@test.by | secret123 | ACTIVE |
| anna@test.by | secret123 | PENDING |
| blocked@test.by | secret123 | BLOCKED |

**Персонал:**
| Email | Пароль | Роль |
|-------|--------|------|
| admin@autoshare.by | admin123 | ADMIN |
| operator@autoshare.by | operator123 | OPERATOR |
| maintenance@autoshare.by | master123 | MAINTENANCE |

## Ключевые решения

- Схема БД: `autoshare` (PostgreSQL schema)
- Авторизация: JWT access + refresh токены, отдельные роли CLIENT / STAFF (ADMIN, OPERATOR, MAINTENANCE)
- Фоновая задача: автоматическое истечение бронирований (каждые 60 сек)
- Тесты: SQLite in-memory, 34 теста

# AutoShare

Платформа каршеринга для Беларуси. Полнофункциональная система управления автопарком, клиентами, бронированиями и арендами с-role-based доступом.

## Технологический стек

**Backend:**
- Python 3.12, FastAPI, Uvicorn
- PostgreSQL 15, SQLAlchemy 2.0, Alembic
- Pydantic, python-jose (JWT), passlib (bcrypt)
- Rate limiting: slowapi

**Frontend:**
- React 19, TypeScript, Vite
- TanStack Router + TanStack Start
- shadcn/ui, Tailwind CSS 4, Recharts
- Leaflet (карты), jsPDF (отчёты)
- Bun (менеджер пакетов)

**Инфраструктура:**
- Docker, Docker Compose
- GitHub Actions (CI/CD)
- GHCR (Container Registry)

## Быстрый старт

```bash
docker-compose up --build
```

Сервисы:
| Сервис | URL |
|--------|-----|
| API | http://localhost:8000 |
| Frontend | http://localhost:80 |
| Health | http://localhost:8000/health |

### Локальная разработка без Docker

```bash
pip install -r requirements.txt
alembic upgrade head
python3 -m app.seed
uvicorn app.main:app --reload
```

### Тестовые аккаунты

После `python3 -m app.seed` создаются:

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

## API эндпоинты

Все эндпоинты доступны по префиксу `/api/v1`. Документация: `http://localhost:8000/docs`

### Auth
- `POST /auth/register` — регистрация клиента
- `POST /auth/login` — вход клиента
- `POST /auth/staff/login` — вход персонала
- `POST /auth/refresh` — обновление токена

### Clients
- `GET /clients/me` — профиль текущего клиента
- `GET /clients/{id}` — профиль клиента (персонал)
- `POST /clients/verify` — подтверждение email
- `POST /clients/{id}/block` — блокировка клиента

### Cars
- `GET /cars/` — список автомобилей
- `GET /cars/free` — доступные авто
- `GET /cars/{id}` — детали автомобиля
- `POST /cars/` — создание (персонал)
- `PATCH /cars/{id}/status` — изменение статуса

### Bookings
- `GET /bookings/` — список бронирований
- `POST /bookings/` — создание бронирования
- `GET /bookings/{id}` — детали бронирования
- `POST /bookings/{id}/cancel` — отмена

### Rentals
- `GET /rentals/` — список аренд
- `POST /rentals/start` — начало аренды
- `GET /rentals/{id}` — детали аренды
- `POST /rentals/{id}/pause` — пауза
- `POST /rentals/{id}/resume` — возобновление
- `POST /rentals/{id}/complete` — завершение

### Tariffs & Zones
- `GET /tariffs/` — список тарифов
- `POST /tariffs/` — создание тарифа
- `PATCH /tariffs/{id}/deactivate` — деактивация
- `GET /tariffs/zones` — список зон
- `POST /tariffs/zones` — создание зоны

### Discounts
- `GET /discounts/` — список скидок
- `POST /discounts/` — создание скидки

### Payments
- `GET /payments/` — список платежей
- `POST /payments/` — создание платежа
- `GET /payments/{id}` — детали платежа

### Maintenance
- `GET /maintenance/` — список работ
- `POST /maintenance/` — создание заявки
- `GET /maintenance/{id}` — детали заявки
- `POST /maintenance/{id}/close` — закрытие заявки
- `GET /maintenance/car/{id}/history` — история обслуживания авто

### Audit & Reports
- `GET /audit-log/` — аудит-лог
- `GET /reports/fleet-utilization` — загрузка автопарка
- `GET /reports/financial` — финансовый отчёт
- `GET /reports/clients` — активность клиентов

### WebSocket
- `WS /ws` — реалтайм уведомления

## Frontend маршруты

### Клиентская часть (`/client`)
- `/client` — главная (карта с авто)
- `/client/cars` — каталог автомобилей
- `/client/bookings` — мои бронирования
- `/client/rentals` — мои аренды
- `/client/zones` — зоны обслуживания
- `/client/profile` — профиль

### Админ-панель (`/staff`)
- `/staff` — дашборд
- `/staff/cars` — управление автопарком
- `/staff/clients` — управление клиентами
- `/staff/staff` — управление персоналом
- `/staff/bookings` — бронирования
- `/staff/rentals` — аренды
- `/staff/payments` — платежи
- `/staff/tariffs` — тарифы
- `/staff/discounts` — скидки
- `/staff/maintenance` — техобслуживание
- `/staff/reports` — отчёты
- `/staff/audit` — аудит-лог
- `/staff/logs` — системные логи

### Авторизация
- `/auth/login` — вход клиента
- `/auth/register` — регистрация
- `/auth/staff/login` — вход персонала

## Разработка

### Тесты

```bash
python3 -m pytest tests/ -v
```

Тесты используют SQLite in-memory для изоляции.

### Миграции

```bash
alembic upgrade head      # применить
alembic revision --autogenerate -m "description"  # создать новую
```

### Окружение

Переменные в `.env`:
```
DATABASE_URL=postgresql://autoshare:autoshare@localhost:5432/autoshare
SECRET_KEY=your-secret-key
```

## CI/CD

### CI (`.github/workflows/ci.yml`)
Три джобы при push/PR:
1. **test** — pytest с PostgreSQL
2. **lint** — ruff check
3. **frontend-build** — TypeScript check + build

### CD (`.github/workflows/cd.yml`)
При теге `v*`:
1. Сборка и пуш Docker-образов в GHCR
2. Деплой на сервер через SSH

## Структура проекта

```
autoshare/
├── app/
│   ├── api/v1/          # REST эндпоинты
│   ├── core/            # конфигурация, БД, безопасность
│   ├── models/          # SQLAlchemy модели (12 таблиц)
│   ├── schemas/         # Pydantic схемы
│   ├── services/        # бизнес-логика
│   ├── main.py          # FastAPI точка входа
│   └── seed.py          # заполнение БД
├── alembic/             # миграции
├── frontend/            # React + TanStack + shadcn/ui
│   ├── src/routes/      # маршруты
│   ├── src/components/  # компоненты
│   └── src/lib/         # утилиты
├── tests/               # pytest тесты
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

## Лицензия

MIT License

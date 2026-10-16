# Пакет документов по проекту AutoShare

Документы составлены на основе фактического кода платформы каршеринга, находящегося в этой папке (`app/`, `frontend/`, `tests/`).

| № | Документ | Файл |
|---|---|---|
| 1 | Бизнес-требования (BR-01…BR-22, критерии приёма, карта требований → модули) | [`business-requirements.md`](business-requirements.md) |
| 2 | Диаграмма вариантов использования (Use Case) | [`use-case-diagram.md`](use-case-diagram.md) · PNG: [`uml/use-case-diagram.png`](uml/use-case-diagram.png) · исходник: [`uml/use-case-diagram.puml`](uml/use-case-diagram.puml) |
| 3 | Диаграмма классов (UML) | [`class-diagram.md`](class-diagram.md) · PNG: [`uml/class-diagram.png`](uml/class-diagram.png) · исходник: [`uml/class-diagram.puml`](uml/class-diagram.puml) |
| 4 | Средства и технологии разработки и аргументы в пользу выбора | [`technologies.md`](technologies.md) |
| 5 | Реализация диаграммы классов на языке программирования (Python) | каталог [`../app/models/`](../app/models/), бизнес-логика — [`../app/api/v1/`](../app/api/v1/), [`../app/services/`](../app/services/) |

## Краткая сводка

**Система:** AutoShare — платформа каршеринга: клиенты, автопарк, бронирования (TTL 20 мин), аренды с паузой, тарифы, зоны, скидки, платежи, техобслуживание, отчёты, аудит, WebSocket-уведомления.

**Акторы:** Клиент, Оператор, Администратор, Мастер, Система.

**Стек:** Python 3.12 + FastAPI + SQLAlchemy 2.0 + PostgreSQL 15 + Alembic (backend), React 19 + TypeScript + TanStack Router + shadcn/ui (frontend), Docker + GitHub Actions (инфраструктура).

**Проверка реализации:** `python3 -m pytest tests/ -v` → 50 passed.

## Перегенерация диаграмм

```bash
java -jar plantuml.jar -tpng docs/uml/*.puml
```

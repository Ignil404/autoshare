from logging.config import fileConfig

from alembic import context
from alembic.ddl import postgresql as pg_impl
from sqlalchemy import engine_from_config, pool, text as sa_text

from app.core.config import settings
from app.core.database import Base
import app.models  # noqa: F401 — register all models on Base

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


# Alembic `_make_foreign_key()` строит ForeignKeyConstraint из отражённых FK,
# но ссылочная таблица (referred_table) в этот момент ещё не загружена в тот же
# MetaData, поэтому SQLAlchemy не может разрешить её schema — source_schema
# и target_schema оказываются None. Без этого патча autogenerate при каждом
# запуске видит "removed FK + added FK" на все внешние ключи в схеме, хотя
# в БД ничего не менялось. Патч нормализует None → default_schema.
_orig_correct_fk = pg_impl.PostgresqlImpl.correct_for_autogen_foreignkeys


def _patched_correct_fk(self, conn_fks, metadata_fks):
    default_schema = self.dialect.default_schema_name
    for fk in list(conn_fks):
        if default_schema is not None:
            if fk.parent.schema is None:
                fk.parent.schema = default_schema
            for elem in fk.elements:
                col = elem.column
                if col is not None and col.table is not None:
                    if col.table.schema is None:
                        col.table.schema = default_schema
    _orig_correct_fk(self, conn_fks, metadata_fks)


pg_impl.PostgresqlImpl.correct_for_autogen_foreignkeys = _patched_correct_fk


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        connection.execute(sa_text("CREATE SCHEMA IF NOT EXISTS autoshare"))
        connection.execute(sa_text("SET search_path TO autoshare, public"))
        connection.commit()
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

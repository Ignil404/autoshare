#!/bin/sh
set -e

echo "Waiting for database..."
python3 -c "
import time, sys
try:
    import psycopg2
    for i in range(30):
        try:
            psycopg2.connect('${DATABASE_URL}')
            print('Database ready')
            sys.exit(0)
        except Exception:
            time.sleep(1)
    print('Database not ready after 30s')
    sys.exit(1)
except ImportError:
    print('psycopg2 not available, skipping wait')
"

echo "Running migrations..."
python3 -m alembic upgrade head

echo "Seeding database..."
python3 -m app.seed

echo "Starting server..."
exec "$@"

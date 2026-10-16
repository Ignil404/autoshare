import asyncio
import logging
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.api.v1 import router as v1_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("autoshare")

limiter = Limiter(key_func=get_remote_address)

EXPIRE_INTERVAL_SECONDS = 60


async def _expire_bookings_loop():
    from app.services.booking_expirer import expire_bookings
    from app.core.database import SessionLocal

    while True:
        try:
            db = SessionLocal()
            try:
                count = expire_bookings(db)
                if count:
                    logger.info("EXPIRE | Expired %d bookings", count)
            finally:
                db.close()
        except Exception:
            logger.exception("EXPIRE | Failed to expire bookings")
        await asyncio.sleep(EXPIRE_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AutoShare API starting...")
    if not os.environ.get("TESTING"):
        task = asyncio.create_task(_expire_bookings_loop())
        yield
        task.cancel()
    else:
        yield
    logger.info("AutoShare API stopped.")


app = FastAPI(title="AutoShare API", version="1.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000
    logger.info(
        "%s %s %d %.0fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    from app.services.log_store import write_log
    write_log(
        "INFO" if response.status_code < 400 else ("WARN" if response.status_code < 500 else "ERROR"),
        f"{request.method} {request.url.path} {response.status_code}",
        {"status": response.status_code, "duration_ms": round(duration_ms), "path": request.url.path, "method": request.method},
    )
    return response


app.include_router(v1_router, prefix="/api/v1")

from app.api.v1.ws import router as ws_router
app.include_router(ws_router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}

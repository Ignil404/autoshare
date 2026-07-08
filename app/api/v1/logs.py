from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import require_auth
from app.services.log_store import read_logs

router = APIRouter()


@router.get("/")
def list_logs(
    level: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=200, le=500),
    payload: dict = Depends(require_auth),
):
    if not payload.get("actor_type", "").startswith("STAFF"):
        return []
    return read_logs(level=level, search=search, limit=limit)

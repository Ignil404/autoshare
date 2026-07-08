from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_auth
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogOut

router = APIRouter()


@router.get("/", response_model=list[AuditLogOut])
def list_audit_log(
    entity: Optional[str] = None,
    entity_id: Optional[int] = None,
    actor_type: Optional[str] = None,
    limit: int = 100,
    payload: dict = Depends(require_auth),
    db: Session = Depends(get_db),
):
    if payload["actor_type"] != "STAFF:ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    q = db.query(AuditLog)
    if entity:
        q = q.filter(AuditLog.entity == entity)
    if entity_id is not None:
        q = q.filter(AuditLog.entity_id == entity_id)
    if actor_type:
        q = q.filter(AuditLog.actor_type == actor_type)
    return q.order_by(AuditLog.created_at.desc()).limit(limit).all()

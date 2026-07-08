from typing import Optional
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_action(
    db: Session,
    actor_type: str,
    actor_id: Optional[int],
    action: str,
    entity: str,
    entity_id: Optional[int] = None,
    details: Optional[dict] = None,
) -> AuditLog:
    record = AuditLog(
        actor_type=actor_type,
        actor_id=actor_id,
        action=action,
        entity=entity,
        entity_id=entity_id,
        details=details,
    )
    db.add(record)
    db.flush()
    return record

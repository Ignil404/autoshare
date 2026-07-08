from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class AuditLogOut(BaseModel):
    log_id: int
    actor_type: str
    actor_id: Optional[int] = None
    action: str
    entity: str
    entity_id: Optional[int] = None
    details: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}

from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_auth
from app.models.discounts import Discount
from app.schemas.discounts import DiscountOut
from app.services.audit_service import log_action

router = APIRouter()


class DiscountCreateRequest(BaseModel):
    code: str
    type: str
    value: float
    valid_from: str = str(date.today())
    valid_until: Optional[str] = None
    usage_limit: Optional[int] = None


@router.get("/", response_model=list[DiscountOut])
def list_discounts(db: Session = Depends(get_db)):
    return db.query(Discount).all()


@router.post("/", response_model=DiscountOut, status_code=status.HTTP_201_CREATED)
def create_discount(body: DiscountCreateRequest, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "STAFF:ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    if db.query(Discount).filter(Discount.code == body.code).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Code already exists")

    discount = Discount(
        code=body.code,
        type=body.type,
        value=body.value,
        valid_from=body.valid_from,
        valid_until=body.valid_until,
        usage_limit=body.usage_limit,
    )
    db.add(discount)
    db.flush()

    log_action(
        db, "STAFF", int(payload["sub"]), "DISCOUNT_CREATED",
        "discounts", discount.discount_id,
        {"code": body.code},
    )
    return discount

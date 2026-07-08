from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_auth
from app.models.tariffs import Tariff
from app.models.zones import Zone
from app.schemas.tariffs import TariffOut, ZoneOut
from app.services.audit_service import log_action

router = APIRouter()


class TariffCreateRequest(BaseModel):
    name: str
    tariff_type: str
    rate_active: float
    rate_pause: float
    min_charge: float = 0
    zone_id: Optional[int] = None


class ZoneCreateRequest(BaseModel):
    name: str
    zone_type: str
    boundary: str


# ---- Zones ----

@router.get("/zones", response_model=list[ZoneOut])
def list_zones(db: Session = Depends(get_db)):
    return db.query(Zone).all()


@router.post("/zones", response_model=ZoneOut, status_code=status.HTTP_201_CREATED)
def create_zone(body: ZoneCreateRequest, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "STAFF:ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    zone = Zone(**body.model_dump())
    db.add(zone)
    db.flush()

    log_action(
        db, "STAFF", int(payload["sub"]), "ZONE_CREATED",
        "zones", zone.zone_id,
    )
    return zone


# ---- Tariffs ----

@router.get("/", response_model=list[TariffOut])
def list_tariffs(db: Session = Depends(get_db)):
    return db.query(Tariff).all()


@router.post("/", response_model=TariffOut, status_code=status.HTTP_201_CREATED)
def create_tariff(body: TariffCreateRequest, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "STAFF:ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    tariff = Tariff(**body.model_dump())
    db.add(tariff)
    db.flush()

    log_action(
        db, "STAFF", int(payload["sub"]), "TARIFF_CREATED",
        "tariffs", tariff.tariff_id,
    )
    return tariff


@router.patch("/{tariff_id}/deactivate", response_model=TariffOut)
def deactivate_tariff(tariff_id: int, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "STAFF:ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    tariff = db.query(Tariff).filter(Tariff.tariff_id == tariff_id).first()
    if not tariff:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tariff not found")

    tariff.status = "INACTIVE"
    db.flush()

    log_action(
        db, "STAFF", int(payload["sub"]), "TARIFF_DEACTIVATED",
        "tariffs", tariff.tariff_id,
    )
    return tariff

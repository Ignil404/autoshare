from typing import Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_auth
from app.models.cars import Car
from app.models.maintenance import Maintenance
from app.models.staff import Staff
from app.schemas.maintenance import MaintenanceOut
from app.services.audit_service import log_action

router = APIRouter()


class MaintenanceCreateRequest(BaseModel):
    car_id: int
    work_type: str
    description: Optional[str] = None
    assigned_to_staff_id: Optional[int] = None


class MaintenanceCloseRequest(BaseModel):
    description: Optional[str] = None


@router.get("/", response_model=list[MaintenanceOut])
def list_maintenance(payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] == "STAFF:MAINTENANCE":
        return db.query(Maintenance).filter(
            Maintenance.assigned_to_staff_id == int(payload["sub"])
        ).all()
    return db.query(Maintenance).all()


@router.get("/{maintenance_id}", response_model=MaintenanceOut)
def get_maintenance(maintenance_id: int, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    record = db.query(Maintenance).filter(Maintenance.maintenance_id == maintenance_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance record not found")
    if payload["actor_type"] == "STAFF:MAINTENANCE" and record.assigned_to_staff_id != int(payload["sub"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your task")
    return record


@router.post("/", response_model=MaintenanceOut, status_code=status.HTTP_201_CREATED)
def create_maintenance(body: MaintenanceCreateRequest, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "STAFF:ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    car = db.query(Car).filter(Car.car_id == body.car_id).first()
    if not car:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found")

    if body.assigned_to_staff_id:
        staff = db.query(Staff).filter(
            Staff.staff_id == body.assigned_to_staff_id,
            Staff.role == "MAINTENANCE",
            Staff.status == "ACTIVE",
        ).first()
        if not staff:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Staff not found or not MAINTENANCE")

    record = Maintenance(
        car_id=body.car_id,
        work_type=body.work_type,
        description=body.description,
        assigned_to_staff_id=body.assigned_to_staff_id,
        mileage_at_open=car.mileage,
    )
    db.add(record)
    car.status = "MAINTENANCE"
    db.flush()

    log_action(
        db, "STAFF", int(payload["sub"]), "MAINTENANCE_CREATED",
        "maintenance", record.maintenance_id,
        {"car_id": body.car_id, "work_type": body.work_type},
    )
    return record


@router.post("/{maintenance_id}/close", response_model=MaintenanceOut)
def close_maintenance(maintenance_id: int, body: MaintenanceCloseRequest = MaintenanceCloseRequest(), payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if not payload["actor_type"].startswith("STAFF"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff only")

    record = db.query(Maintenance).filter(Maintenance.maintenance_id == maintenance_id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance record not found")
    if payload["actor_type"] == "STAFF:MAINTENANCE" and record.assigned_to_staff_id != int(payload["sub"]):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your task")

    record.status = "CLOSED"
    record.completed_at = datetime.now(timezone.utc)
    if body.description:
        record.description = body.description

    car = db.query(Car).filter(Car.car_id == record.car_id).first()
    if car:
        car.status = "FREE"
        car.last_service = record.completed_at.date()
    db.flush()

    log_action(
        db, "STAFF", int(payload["sub"]), "MAINTENANCE_CLOSED",
        "maintenance", record.maintenance_id,
    )
    return record


@router.get("/car/{car_id}/history", response_model=list[MaintenanceOut])
def car_maintenance_history(car_id: int, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if not payload["actor_type"].startswith("STAFF"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff only")
    return db.query(Maintenance).filter(
        Maintenance.car_id == car_id
    ).order_by(Maintenance.created_at.desc()).all()

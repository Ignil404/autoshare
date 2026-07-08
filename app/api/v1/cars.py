from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_auth
from app.models.cars import Car
from app.schemas.cars import CarOut
from app.services.audit_service import log_action

router = APIRouter()


class CarCreateRequest(BaseModel):
    plate_number: str
    brand: str
    model: str
    year: int
    color: Optional[str] = None
    car_class: str
    tariff_id: Optional[int] = None
    zone_id: Optional[int] = None


class CarUpdateStatusRequest(BaseModel):
    status: str


@router.get("/", response_model=list[CarOut])
def list_cars(car_class: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Car)
    if car_class:
        q = q.filter(Car.car_class == car_class.upper())
    return q.all()


@router.get("/free", response_model=list[CarOut])
def list_free_cars(car_class: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(Car).filter(Car.status == "FREE")
    if car_class:
        q = q.filter(Car.car_class == car_class.upper())
    return q.order_by(Car.car_id).all()


@router.get("/{car_id}", response_model=CarOut)
def get_car(car_id: int, db: Session = Depends(get_db)):
    car = db.query(Car).filter(Car.car_id == car_id).first()
    if not car:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found")
    return car


@router.post("/", response_model=CarOut, status_code=status.HTTP_201_CREATED)
def create_car(body: CarCreateRequest, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "STAFF:ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    if db.query(Car).filter(Car.plate_number == body.plate_number).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Plate number already exists")

    car = Car(**body.model_dump())
    db.add(car)
    db.flush()

    log_action(
        db, "STAFF", int(payload["sub"]), "CAR_CREATED",
        "cars", car.car_id,
        {"plate_number": body.plate_number},
    )
    return car


@router.patch("/{car_id}/status", response_model=CarOut)
def update_car_status(
    car_id: int,
    body: CarUpdateStatusRequest,
    payload: dict = Depends(require_auth),
    db: Session = Depends(get_db),
):
    if not payload["actor_type"].startswith("STAFF"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff only")

    car = db.query(Car).filter(Car.car_id == car_id).first()
    if not car:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found")

    car.status = body.status
    db.flush()

    from app.services.ws_manager import broadcast_sync
    broadcast_sync({
        "type": "car_status_changed",
        "car_id": car.car_id,
        "status": car.status,
        "plate_number": car.plate_number,
        "brand": car.brand,
        "model": car.model,
    })

    log_action(
        db, "STAFF", int(payload["sub"]), "CAR_STATUS_CHANGED",
        "cars", car.car_id,
        {"new_status": body.status},
    )
    return car

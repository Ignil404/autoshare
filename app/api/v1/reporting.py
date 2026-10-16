from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_auth
from app.models.cars import Car
from app.models.payments import Payment
from app.models.rentals import Rental
from app.models.tariffs import Tariff

router = APIRouter()


@router.get("/fleet-utilization")
def fleet_utilization(start: str, end: str, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "STAFF:ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    rows = (
        db.query(
            Car.car_id,
            Car.plate_number,
            Car.brand,
            Car.model,
            func.count(Rental.rental_id).label("rentals_count"),
            func.coalesce(func.sum(Rental.active_minutes), 0).label("total_active_minutes"),
            func.coalesce(func.sum(Rental.distance_km), 0).label("total_distance"),
            func.coalesce(func.sum(Rental.total_cost), 0).label("total_revenue"),
        )
        .outerjoin(Rental, Rental.car_id == Car.car_id)
        .group_by(Car.car_id)
        .all()
    )
    return [
        {
            "car_id": r.car_id,
            "plate_number": r.plate_number,
            "brand": r.brand,
            "model": r.model,
            "rentals_count": r.rentals_count,
            "total_active_minutes": r.total_active_minutes,
            "total_distance": float(r.total_distance),
            "total_revenue": float(r.total_revenue),
        }
        for r in rows
    ]


@router.get("/financial")
def financial_report(start: str, end: str, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "STAFF:ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    rows = (
        db.query(
            Tariff.tariff_id,
            Tariff.name,
            func.count(Rental.rental_id).label("rentals_count"),
            func.coalesce(func.sum(Rental.total_cost), 0).label("total_revenue"),
            func.avg(Rental.total_cost).label("avg_cost"),
        )
        .join(Rental, Rental.tariff_id == Tariff.tariff_id)
        .group_by(Tariff.tariff_id)
        .all()
    )

    fines = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.payment_type == "FINE",
        Payment.status == "COMPLETED",
    ).scalar()

    return {
        "by_tariff": [
            {
                "tariff_id": r.tariff_id,
                "name": r.name,
                "rentals_count": r.rentals_count,
                "total_revenue": float(r.total_revenue),
                "avg_cost": float(r.avg_cost) if r.avg_cost else 0,
            }
            for r in rows
        ],
        "total_fines": float(fines),
    }


@router.get("/clients")
def client_activity(start: str, end: str, payload: dict = Depends(require_auth), db: Session = Depends(get_db)):
    if payload["actor_type"] != "STAFF:ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")

    rows = (
        db.query(
            Rental.client_id,
            func.count(Rental.rental_id).label("rentals_count"),
            func.coalesce(func.avg(Rental.total_cost), 0).label("avg_cost"),
            func.coalesce(func.sum(Rental.total_cost), 0).label("total_spent"),
        )
        .group_by(Rental.client_id)
        .all()
    )
    return [
        {
            "client_id": r.client_id,
            "rentals_count": r.rentals_count,
            "avg_cost": float(r.avg_cost),
            "total_spent": float(r.total_spent),
        }
        for r in rows
    ]

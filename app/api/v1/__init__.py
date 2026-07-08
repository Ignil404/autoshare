from fastapi import APIRouter

from app.api.v1 import auth, clients, staff, cars, tariffs, discounts, bookings, rentals, payments, maintenance, audit_log, reporting, logs, car_photos, email

router = APIRouter()
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(clients.router, prefix="/clients", tags=["clients"])
router.include_router(staff.router, prefix="/staff", tags=["staff"])
router.include_router(cars.router, prefix="/cars", tags=["cars"])
router.include_router(tariffs.router, prefix="/tariffs", tags=["tariffs"])
router.include_router(discounts.router, prefix="/discounts", tags=["discounts"])
router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
router.include_router(rentals.router, prefix="/rentals", tags=["rentals"])
router.include_router(payments.router, prefix="/payments", tags=["payments"])
router.include_router(maintenance.router, prefix="/maintenance", tags=["maintenance"])
router.include_router(audit_log.router, prefix="/audit-log", tags=["audit-log"])
router.include_router(reporting.router, prefix="/reports", tags=["reports"])
router.include_router(logs.router, prefix="/logs", tags=["logs"])
router.include_router(car_photos.router, prefix="/cars", tags=["car-photos"])
router.include_router(email.router, prefix="/email", tags=["email"])

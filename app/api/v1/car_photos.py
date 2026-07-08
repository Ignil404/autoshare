import os

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_auth
from app.models.cars import Car
from app.services.audit_service import log_action

router = APIRouter()

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "cars")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/{car_id}/photo")
async def upload_car_photo(
    car_id: int,
    file: UploadFile = File(...),
    payload: dict = Depends(require_auth),
    db: Session = Depends(get_db),
):
    if not payload["actor_type"].startswith("STAFF"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff only")

    car = db.query(Car).filter(Car.car_id == car_id).first()
    if not car:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Car not found")

    ext = os.path.splitext(file.filename or "photo.jpg")[1] or ".jpg"
    filename = f"car_{car_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large (max 5MB)")

    with open(filepath, "wb") as f:
        f.write(content)

    log_action(
        db, "STAFF", int(payload["sub"]), "CAR_PHOTO_UPLOADED",
        "cars", car.car_id,
        {"filename": filename},
    )
    return {"filename": filename, "url": f"/api/v1/cars/{car_id}/photo"}


@router.get("/{car_id}/photo")
def get_car_photo(car_id: int):
    for ext in [".jpg", ".jpeg", ".png", ".webp"]:
        filepath = os.path.join(UPLOAD_DIR, f"car_{car_id}{ext}")
        if os.path.exists(filepath):
            return FileResponse(filepath)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Photo not found")

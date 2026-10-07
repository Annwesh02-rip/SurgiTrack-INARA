import os
import uuid

from fastapi import (
    APIRouter,
    Depends,
    File,
    UploadFile,
    HTTPException
)

from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ImageRecord


router = APIRouter(
    prefix="/images",
    tags=["Images"]
)


BASE_UPLOAD_DIR = "../uploads"


@router.post("/upload")
async def upload_image(
    procedure_id: int,
    image_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):

    if image_type not in ["pre_op", "post_op"]:
        raise HTTPException(
            status_code=400,
            detail="image_type must be pre_op or post_op"
        )

    extension = os.path.splitext(
        file.filename
    )[1]

    unique_name = (
        f"{uuid.uuid4()}{extension}"
    )

    directory = os.path.join(
        BASE_UPLOAD_DIR,
        image_type
    )

    os.makedirs(
        directory,
        exist_ok=True
    )

    file_path = os.path.join(
        directory,
        unique_name
    )

    content = await file.read()

    with open(file_path, "wb") as buffer:
        buffer.write(content)

    record = ImageRecord(
        procedure_id=procedure_id,
        filename=file.filename,
        file_path=file_path,
        image_type=image_type
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "Image uploaded successfully",
        "image_id": record.id,
        "filename": unique_name,
        "path": file_path
    }
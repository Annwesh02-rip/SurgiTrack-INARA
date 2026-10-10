import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)

from sqlalchemy.orm import Session

from starlette.concurrency import (
    run_in_threadpool,
)

from ..auth import get_current_user
from ..database import get_db

from ..models import (
    ImageRecord,
    Procedure,
    User,
)

from ..schemas import (
    ImageResponse,
    ImageUploadResponse,
)

from ..services.vision_service import (
    vision_service,
)


router = APIRouter(
    prefix="/images",
    tags=["Images"],
)


# =========================================================
# PATH CONFIGURATION
# =========================================================

PROJECT_ROOT = (
    Path(__file__)
    .resolve()
    .parents[2]
)

UPLOAD_DIR = (
    PROJECT_ROOT
    / "uploads"
)


# =========================================================
# GET USER-OWNED PROCEDURE
# =========================================================

def get_owned_procedure(
    procedure_id: int,
    current_user: User,
    db: Session,
):

    procedure = (
        db.query(Procedure)
        .filter(
            Procedure.id
            == procedure_id,
            Procedure.created_by
            == current_user.id,
        )
        .first()
    )

    if not procedure:

        raise HTTPException(
            status_code=404,
            detail="Procedure not found",
        )

    return procedure


# =========================================================
# UPLOAD IMAGE
# =========================================================

@router.post(
    "/upload",
    response_model=ImageUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_image(
    procedure_id: int,
    image_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):

    # -----------------------------------------------------
    # CHECK PROCEDURE
    # -----------------------------------------------------

    get_owned_procedure(
        procedure_id,
        current_user,
        db,
    )


    # -----------------------------------------------------
    # VALIDATE IMAGE TYPE
    # -----------------------------------------------------

    clean_type = (
        image_type
        .strip()
        .lower()
    )

    if clean_type not in {
        "pre_op",
        "post_op",
    }:

        raise HTTPException(
            status_code=400,
            detail=(
                "image_type must be "
                "pre_op or post_op"
            ),
        )


    # -----------------------------------------------------
    # VALIDATE FILE CONTENT TYPE
    # -----------------------------------------------------

    if (
        file.content_type
        and not file.content_type.startswith(
            "image/"
        )
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Uploaded file must be an image"
            ),
        )


    # -----------------------------------------------------
    # ORIGINAL FILE NAME
    # -----------------------------------------------------

    original_name = (
        file.filename
        or "capture.jpg"
    )


    # -----------------------------------------------------
    # FILE EXTENSION
    # -----------------------------------------------------

    extension = (
        Path(original_name)
        .suffix
        .lower()
    )

    if extension not in {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
    }:

        extension = ".jpg"


    # -----------------------------------------------------
    # UPLOAD DIRECTORY
    # -----------------------------------------------------

    directory = (
        UPLOAD_DIR
        / clean_type
    )

    directory.mkdir(
        parents=True,
        exist_ok=True,
    )


    # -----------------------------------------------------
    # UNIQUE FILE NAME
    # -----------------------------------------------------

    unique_name = (
        f"{uuid.uuid4().hex}"
        f"{extension}"
    )

    file_path = (
        directory
        / unique_name
    )


    # -----------------------------------------------------
    # READ UPLOAD
    # -----------------------------------------------------

    content = await file.read()

    if not content:

        raise HTTPException(
            status_code=400,
            detail=(
                "Uploaded image is empty"
            ),
        )


    # -----------------------------------------------------
    # SAVE IMAGE TO DISK
    # -----------------------------------------------------

    try:

        with open(
            file_path,
            "wb",
        ) as buffer:

            buffer.write(
                content
            )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to save image: "
                f"{exc}"
            ),
        )


    # -----------------------------------------------------
    # DATABASE IMAGE RECORD
    # -----------------------------------------------------

    record = ImageRecord(
        procedure_id=procedure_id,
        image_path=str(
            file_path
        ),
        image_type=clean_type,
    )

    db.add(
        record
    )


    try:

        db.commit()

        db.refresh(
            record
        )

    except Exception:

        db.rollback()

        try:

            file_path.unlink(
                missing_ok=True
            )

        except Exception:

            pass

        raise


    # =====================================================
    # RUN CNN
    # =====================================================

    try:

        vision_result = (
            await run_in_threadpool(
                vision_service.detect_instruments,
                str(file_path),
            )
        )

    except Exception as exc:

        vision_result = {

            "detections": [],

            "counts": {},

            "total": 0,

            "candidate_regions": 0,

            "models_run": 0,

            "errors": {
                "vision_service": str(
                    exc
                )
            },
        }


    # =====================================================
    # RETURN DATABASE + CNN DATA
    # =====================================================

    return {

        "image": record,

        "vision": vision_result,
    }


# =========================================================
# GET ALL IMAGES FOR PROCEDURE
# =========================================================

@router.get(
    "/procedure/{procedure_id}",
    response_model=list[
        ImageResponse
    ],
)
def get_procedure_images(
    procedure_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):

    get_owned_procedure(
        procedure_id,
        current_user,
        db,
    )

    return (
        db.query(
            ImageRecord
        )
        .filter(
            ImageRecord.procedure_id
            == procedure_id
        )
        .order_by(
            ImageRecord
            .uploaded_at
            .desc()
        )
        .all()
    )
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)

from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Procedure, User
from ..schemas import (
    ProcedureCreate,
    ProcedureResponse,
    ProcedureStatusUpdate,
)


router = APIRouter(
    prefix="/procedures",
    tags=["Procedures"],
)


ALLOWED_STATUSES = {
    "created",
    "rfid_registration",
    "pre_op",
    "active",
    "post_op",
    "reconciliation",
    "completed",
    "cancelled",
}


# =========================================================
# CREATE PROCEDURE
# =========================================================

@router.post(
    "/",
    response_model=ProcedureResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_procedure(
    data: ProcedureCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    case_id = (
        data.case_id
        .strip()
        .upper()
    )

    existing = (
        db.query(Procedure)
        .filter(
            Procedure.case_id
            == case_id
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Case ID already exists",
        )

    procedure = Procedure(
        case_id=case_id,
        procedure_name=(
            data.procedure_name.strip()
        ),
        surgeon_name=(
            data.surgeon_name.strip()
        ),
        ot_room=(
            data.ot_room
            .strip()
            .upper()
        ),
        status="created",
        created_by=current_user.id,
    )

    db.add(procedure)

    try:
        db.commit()
        db.refresh(procedure)

    except Exception:
        db.rollback()
        raise

    return procedure


# =========================================================
# LIST CURRENT USER PROCEDURES
# =========================================================

@router.get(
    "/",
    response_model=list[ProcedureResponse],
)
def get_procedures(
    procedure_status: Optional[str] = Query(
        default=None,
        alias="status",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    query = (
        db.query(Procedure)
        .filter(
            Procedure.created_by
            == current_user.id
        )
    )

    if procedure_status:
        query = query.filter(
            Procedure.status
            == procedure_status
            .strip()
            .lower()
        )

    return (
        query
        .order_by(
            Procedure.created_at.desc()
        )
        .all()
    )


# =========================================================
# HISTORY
# =========================================================

@router.get(
    "/history",
    response_model=list[ProcedureResponse],
)
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    return (
        db.query(Procedure)
        .filter(
            Procedure.created_by
            == current_user.id,
            Procedure.status.in_(
                [
                    "completed",
                    "cancelled",
                ]
            ),
        )
        .order_by(
            Procedure.updated_at.desc()
        )
        .all()
    )


# =========================================================
# GET SINGLE PROCEDURE
# =========================================================

@router.get(
    "/{procedure_id}",
    response_model=ProcedureResponse,
)
def get_procedure(
    procedure_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
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
# UPDATE STATUS
# =========================================================

@router.patch(
    "/{procedure_id}/status",
    response_model=ProcedureResponse,
)
def update_procedure_status(
    procedure_id: int,
    data: ProcedureStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
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

    new_status = (
        data.status
        .strip()
        .lower()
    )

    if new_status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Invalid procedure status",
        )

    procedure.status = new_status

    try:
        db.commit()
        db.refresh(procedure)

    except Exception:
        db.rollback()
        raise

    return procedure


# =========================================================
# CANCEL PROCEDURE
# =========================================================

@router.post(
    "/{procedure_id}/cancel",
    response_model=ProcedureResponse,
)
def cancel_procedure(
    procedure_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
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

    if procedure.status == "completed":
        raise HTTPException(
            status_code=400,
            detail="Completed procedure cannot be cancelled",
        )

    procedure.status = "cancelled"

    db.commit()
    db.refresh(procedure)

    return procedure


# =========================================================
# DELETE
# =========================================================

@router.delete(
    "/{procedure_id}"
)
def delete_procedure(
    procedure_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
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

    db.delete(procedure)
    db.commit()

    return {
        "message":
            "Procedure deleted successfully"
    }
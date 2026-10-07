import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Procedure
from ..schemas import (
    ProcedureCreate,
    ProcedureResponse
)

from ..auth import get_current_user


router = APIRouter(
    prefix="/procedures",
    tags=["Procedures"]
)


@router.post(
    "/",
    response_model=ProcedureResponse
)
def create_procedure(
    data: ProcedureCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    procedure = Procedure(
        patient_name=data.patient_name,
        patient_id=data.patient_id,
        procedure_name=data.procedure_name,
        surgeon_name=data.surgeon_name,
        operating_room=data.operating_room,
        status="created",
        expected_instruments=json.dumps(
            data.expected_instruments or []
        )
    )

    db.add(procedure)
    db.commit()
    db.refresh(procedure)

    return procedure


@router.get(
    "/",
    response_model=list[ProcedureResponse]
)
def get_procedures(
    db: Session = Depends(get_db)
):

    return db.query(Procedure).order_by(
        Procedure.created_at.desc()
    ).all()


@router.get(
    "/{procedure_id}",
    response_model=ProcedureResponse
)
def get_procedure(
    procedure_id: int,
    db: Session = Depends(get_db)
):

    procedure = db.query(Procedure).filter(
        Procedure.id == procedure_id
    ).first()

    if not procedure:
        raise HTTPException(
            status_code=404,
            detail="Procedure not found"
        )

    return procedure


@router.patch("/{procedure_id}/status")
def update_procedure_status(
    procedure_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    procedure = db.query(Procedure).filter(
        Procedure.id == procedure_id
    ).first()

    if not procedure:
        raise HTTPException(
            status_code=404,
            detail="Procedure not found"
        )

    procedure.status = status

    db.commit()
    db.refresh(procedure)

    return {
        "message": "Procedure status updated",
        "status": procedure.status
    }


@router.delete("/{procedure_id}")
def delete_procedure(
    procedure_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    procedure = db.query(Procedure).filter(
        Procedure.id == procedure_id
    ).first()

    if not procedure:
        raise HTTPException(
            status_code=404,
            detail="Procedure not found"
        )

    db.delete(procedure)
    db.commit()

    return {
        "message": "Procedure deleted successfully"
    }
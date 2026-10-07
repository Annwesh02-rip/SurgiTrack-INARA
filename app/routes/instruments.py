from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Instrument
from ..schemas import (
    InstrumentCreate,
    InstrumentResponse
)
from ..auth import get_current_user


router = APIRouter(
    prefix="/instruments",
    tags=["Instruments"]
)


@router.post(
    "/",
    response_model=InstrumentResponse
)
def create_instrument(
    data: InstrumentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    existing = db.query(Instrument).filter(
        Instrument.instrument_code ==
        data.instrument_code
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Instrument code already exists"
        )

    instrument = Instrument(
        name=data.name,
        instrument_code=data.instrument_code,
        rfid_tag=data.rfid_tag,
        category=data.category
    )

    db.add(instrument)
    db.commit()
    db.refresh(instrument)

    return instrument


@router.get(
    "/",
    response_model=list[InstrumentResponse]
)
def get_instruments(
    db: Session = Depends(get_db)
):

    return db.query(Instrument).all()


@router.get(
    "/{instrument_id}",
    response_model=InstrumentResponse
)
def get_instrument(
    instrument_id: int,
    db: Session = Depends(get_db)
):

    instrument = db.query(Instrument).filter(
        Instrument.id == instrument_id
    ).first()

    if not instrument:
        raise HTTPException(
            status_code=404,
            detail="Instrument not found"
        )

    return instrument


@router.delete("/{instrument_id}")
def delete_instrument(
    instrument_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):

    instrument = db.query(Instrument).filter(
        Instrument.id == instrument_id
    ).first()

    if not instrument:
        raise HTTPException(
            status_code=404,
            detail="Instrument not found"
        )

    db.delete(instrument)
    db.commit()

    return {
        "message": "Instrument deleted successfully"
    }
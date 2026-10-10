from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import (
    Instrument,
    Procedure,
    ProcedureInstrument,
    User,
)
from ..schemas import (
    InstrumentCreate,
    InstrumentResponse,
    ProcedureInstrumentResponse,
    RFIDRegistrationRequest,
)


router = APIRouter(
    prefix="/instruments",
    tags=["Instruments"],
)


def get_owned_procedure(
    procedure_id: int,
    current_user: User,
    db: Session,
):
    procedure = (
        db.query(Procedure)
        .filter(
            Procedure.id == procedure_id,
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


def link_to_response(
    link: ProcedureInstrument,
):
    instrument = link.instrument

    return {
        "link_id": link.id,
        "procedure_id":
            link.procedure_id,
        "rfid_uid":
            link.instrument_rfid_uid,
        "name":
            instrument.name,
        "instrument_type":
            instrument.instrument_type,
        "expected":
            link.expected,
        "detected":
            link.detected,
    }


# =========================================================
# REGISTER RFID WITH PROCEDURE
# =========================================================

@router.post(
    "/procedure/{procedure_id}",
    response_model=ProcedureInstrumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_procedure_instrument(
    procedure_id: int,
    data: RFIDRegistrationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    procedure = get_owned_procedure(
        procedure_id,
        current_user,
        db,
    )

    if procedure.status in {
        "completed",
        "cancelled",
    }:
        raise HTTPException(
            status_code=400,
            detail="Procedure is already closed",
        )

    rfid_uid = (
        data.rfid_uid
        .strip()
        .upper()
    )

    instrument = (
        db.query(Instrument)
        .filter(
            Instrument.rfid_uid
            == rfid_uid
        )
        .first()
    )

    if not instrument:
        raise HTTPException(
            status_code=404,
            detail="RFID instrument not found",
        )

    if not instrument.is_active:
        raise HTTPException(
            status_code=400,
            detail="Instrument is inactive",
        )

    existing = (
        db.query(ProcedureInstrument)
        .filter(
            ProcedureInstrument.procedure_id
            == procedure_id,
            ProcedureInstrument.instrument_rfid_uid
            == rfid_uid,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Instrument already registered for this procedure",
        )

    link = ProcedureInstrument(
        procedure_id=procedure_id,
        instrument_rfid_uid=rfid_uid,
        expected=True,
        detected=False,
    )

    instrument.status = "in_use"

    db.add(link)

    try:
        db.commit()
        db.refresh(link)

    except Exception:
        db.rollback()
        raise

    return link_to_response(
        link
    )


# =========================================================
# LIST PROCEDURE RFID INSTRUMENTS
# =========================================================

@router.get(
    "/procedure/{procedure_id}",
    response_model=list[
        ProcedureInstrumentResponse
    ],
)
def get_procedure_instruments(
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

    links = (
        db.query(ProcedureInstrument)
        .filter(
            ProcedureInstrument.procedure_id
            == procedure_id
        )
        .order_by(
            ProcedureInstrument.created_at.asc()
        )
        .all()
    )

    return [
        link_to_response(link)
        for link in links
    ]


# =========================================================
# POST-OP RFID DETECTION
#
# Your Arduino/Python serial reader can call this endpoint
# later without changing the database architecture.
# =========================================================

@router.post(
    "/procedure/{procedure_id}/detected",
    response_model=ProcedureInstrumentResponse,
)
def mark_instrument_detected(
    procedure_id: int,
    data: RFIDRegistrationRequest,
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

    rfid_uid = (
        data.rfid_uid
        .strip()
        .upper()
    )

    link = (
        db.query(ProcedureInstrument)
        .filter(
            ProcedureInstrument.procedure_id
            == procedure_id,
            ProcedureInstrument.instrument_rfid_uid
            == rfid_uid,
        )
        .first()
    )

    if not link:
        raise HTTPException(
            status_code=404,
            detail=(
                "Instrument was not registered "
                "for this procedure"
            ),
        )

    link.detected = True

    db.commit()
    db.refresh(link)

    return link_to_response(
        link
    )


# =========================================================
# REMOVE INSTRUMENT FROM PROCEDURE
# =========================================================

@router.delete(
    "/procedure/{procedure_id}/{rfid_uid}"
)
def remove_procedure_instrument(
    procedure_id: int,
    rfid_uid: str,
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

    clean_uid = (
        rfid_uid
        .strip()
        .upper()
    )

    link = (
        db.query(ProcedureInstrument)
        .filter(
            ProcedureInstrument.procedure_id
            == procedure_id,
            ProcedureInstrument.instrument_rfid_uid
            == clean_uid,
        )
        .first()
    )

    if not link:
        raise HTTPException(
            status_code=404,
            detail="Registered instrument not found",
        )

    instrument = link.instrument

    db.delete(link)

    if instrument:
        instrument.status = "available"

    db.commit()

    return {
        "message":
            "Instrument removed from procedure"
    }


# =========================================================
# CREATE INVENTORY INSTRUMENT
# =========================================================

@router.post(
    "/",
    response_model=InstrumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_instrument(
    data: InstrumentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    rfid_uid = (
        data.rfid_uid
        .strip()
        .upper()
    )

    existing = (
        db.query(Instrument)
        .filter(
            Instrument.rfid_uid
            == rfid_uid
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="RFID UID already exists",
        )

    instrument = Instrument(
        rfid_uid=rfid_uid,
        name=data.name.strip(),
        instrument_type=(
            data.instrument_type
            .strip()
            .lower()
        ),
        description=data.description,
        status="available",
        is_active=True,
    )

    db.add(instrument)
    db.commit()
    db.refresh(instrument)

    return instrument


# =========================================================
# LIST INVENTORY
# =========================================================

@router.get(
    "/",
    response_model=list[
        InstrumentResponse
    ],
)
def get_instruments(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    return (
        db.query(Instrument)
        .order_by(
            Instrument.name.asc()
        )
        .all()
    )


# =========================================================
# GET INVENTORY ITEM BY RFID
# =========================================================

@router.get(
    "/{rfid_uid}",
    response_model=InstrumentResponse,
)
def get_instrument(
    rfid_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    instrument = (
        db.query(Instrument)
        .filter(
            Instrument.rfid_uid
            == rfid_uid
            .strip()
            .upper()
        )
        .first()
    )

    if not instrument:
        raise HTTPException(
            status_code=404,
            detail="Instrument not found",
        )

    return instrument


# =========================================================
# DELETE INVENTORY ITEM
# =========================================================

@router.delete(
    "/{rfid_uid}"
)
def delete_instrument(
    rfid_uid: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    instrument = (
        db.query(Instrument)
        .filter(
            Instrument.rfid_uid
            == rfid_uid
            .strip()
            .upper()
        )
        .first()
    )

    if not instrument:
        raise HTTPException(
            status_code=404,
            detail="Instrument not found",
        )

    if instrument.procedure_links:
        raise HTTPException(
            status_code=409,
            detail=(
                "Instrument has procedure records "
                "and cannot be deleted"
            ),
        )

    db.delete(instrument)
    db.commit()

    return {
        "message":
            "Instrument deleted successfully"
    }
import time

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import User
from app.services.rfid_service import (
    rfid_service,
)


router = APIRouter(
    prefix="/rfid",
    tags=["RFID"],
)


# =========================================================
# CONNECT ARDUINO
# =========================================================

@router.post("/connect")
def connect_rfid(
    current_user: User = Depends(
        get_current_user
    ),
):

    result = rfid_service.connect()

    if not result.get(
        "connected"
    ):
        raise HTTPException(
            status_code=503,
            detail=result,
        )

    return result


# =========================================================
# DISCONNECT ARDUINO
# =========================================================

@router.post("/disconnect")
def disconnect_rfid(
    current_user: User = Depends(
        get_current_user
    ),
):

    return (
        rfid_service.disconnect()
    )


# =========================================================
# RFID STATUS
# =========================================================

@router.get("/status")
def rfid_status(
    current_user: User = Depends(
        get_current_user
    ),
):

    return (
        rfid_service.status()
    )


# =========================================================
# READ LIVE RFID AND COMPARE WITH MASTER DATABASE
# =========================================================

@router.get("/scan")
def scan_rfid(
    db: Session = Depends(
        get_db
    ),
    current_user: User = Depends(
        get_current_user
    ),
):

    status = (
        rfid_service.status()
    )

    if not status.get(
        "connected"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "RFID reader is not connected. "
                "Call POST /rfid/connect first."
            ),
        )

    # Arduino prints several lines for one scan:
    #
    # RFID UID: ...
    # INSTRUMENT ... SCISSOR
    #
    # So we read multiple lines until we
    # find an actual RFID instrument event.

    deadline = (
        time.time()
        + 6
    )

    last_result = None

    while time.time() < deadline:

        result = (
            rfid_service.read_and_compare(
                db
            )
        )

        last_result = result

        result_status = (
            result.get(
                "status"
            )
        )

        if result_status in {
            "pending_confirmation",
            "unknown",
            "inactive",
        }:
            return result

    if last_result:

        return {
            "status":
                "waiting",

            "matched":
                False,

            "message":
                "No RFID instrument detected yet",

            "last_reader_result":
                last_result,
        }

    return {
        "status":
            "waiting",

        "matched":
            False,

        "message":
            "No RFID instrument detected yet",
    }


# =========================================================
# LAST SCAN
# =========================================================

@router.get("/latest")
def latest_rfid_scan(
    current_user: User = Depends(
        get_current_user
    ),
):

    return {
        "last_scan":
            rfid_service.last_scan,
    }
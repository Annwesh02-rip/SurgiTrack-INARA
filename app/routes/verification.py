import json

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import (
    ImageRecord,
    Procedure,
    ProcedureInstrument,
    User,
    Verification,
)
from ..schemas import (
    VerificationRequest,
    VerificationResponse,
)


router = APIRouter(
    prefix="/verification",
    tags=["Verification"],
)


# =========================================================
# RUN VERIFICATION
# =========================================================

@router.post(
    "/run",
    response_model=VerificationResponse,
)
def run_verification(
    request: VerificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        get_current_user
    ),
):
    procedure = (
        db.query(Procedure)
        .filter(
            Procedure.id
            == request.procedure_id,
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

    # -----------------------------------------------------
    # RFID REGISTERED / EXPECTED
    # -----------------------------------------------------

    links = (
        db.query(ProcedureInstrument)
        .filter(
            ProcedureInstrument.procedure_id
            == procedure.id,
            ProcedureInstrument.expected
            == True,
        )
        .all()
    )

    expected_uids = [
        link.instrument_rfid_uid
        for link in links
    ]

    detected_uids = [
        link.instrument_rfid_uid
        for link in links
        if link.detected
    ]

    expected_set = set(
        expected_uids
    )

    detected_set = set(
        detected_uids
    )

    # -----------------------------------------------------
    # CAMERA CAPTURES
    # -----------------------------------------------------

    pre_op_image = (
        db.query(ImageRecord)
        .filter(
            ImageRecord.procedure_id
            == procedure.id,
            ImageRecord.image_type
            == "pre_op",
        )
        .order_by(
            ImageRecord.uploaded_at.desc()
        )
        .first()
    )

    post_op_image = (
        db.query(ImageRecord)
        .filter(
            ImageRecord.procedure_id
            == procedure.id,
            ImageRecord.image_type
            == "post_op",
        )
        .order_by(
            ImageRecord.uploaded_at.desc()
        )
        .first()
    )

    pre_op_captured = (
        pre_op_image is not None
    )

    post_op_captured = (
        post_op_image is not None
    )

    # -----------------------------------------------------
    # RFID RECONCILIATION
    #
    # If post-op RFID scans have started, compare them.
    # If hardware has not been integrated yet, we do NOT
    # fabricate missing-instrument results.
    # -----------------------------------------------------

    if detected_uids:
        missing_items = sorted(
            expected_set
            - detected_set
        )

        unexpected_items = sorted(
            detected_set
            - expected_set
        )

        if (
            not missing_items
            and not unexpected_items
        ):
            rfid_status = "verified"

        else:
            rfid_status = "mismatch"

    else:
        missing_items = []
        unexpected_items = []
        rfid_status = "pending"

    # -----------------------------------------------------
    # CNN
    #
    # Actual CNN will be integrated next.
    # -----------------------------------------------------

    cnn_status = "pending"

    # -----------------------------------------------------
    # CURRENT HACKATHON COMPLETION CONDITION
    #
    # This matches the frontend logic we already agreed on:
    #
    # - at least one RFID instrument registered
    # - pre-op capture exists
    # - post-op capture exists
    #
    # CNN pending does NOT fabricate a pass/fail result.
    # -----------------------------------------------------

    acquisition_complete = (
        len(expected_uids) > 0
        and pre_op_captured
        and post_op_captured
    )

    if not acquisition_complete:
        verification_status = (
            "pending"
        )

    elif rfid_status == "mismatch":
        verification_status = (
            "mismatch"
        )

    else:
        verification_status = (
            "ready_for_completion"
        )

    ready_to_complete = (
        verification_status
        == "ready_for_completion"
    )

    # -----------------------------------------------------
    # DATABASE RECORD
    # -----------------------------------------------------

    details = {
        "expected_rfid_uids":
            expected_uids,

        "detected_rfid_uids":
            detected_uids,

        "pre_op_captured":
            pre_op_captured,

        "post_op_captured":
            post_op_captured,

        "rfid_status":
            rfid_status,

        "cnn_status":
            cnn_status,

        "ready_to_complete":
            ready_to_complete,
    }

    verification = Verification(
        procedure_id=procedure.id,
        status=verification_status,
        expected_count=len(
            expected_uids
        ),
        detected_count=len(
            detected_uids
        ),
        missing_count=len(
            missing_items
        ),
        extra_count=len(
            unexpected_items
        ),
        details=json.dumps(
            details
        ),
    )

    db.add(verification)
    db.commit()

    return {
        "status":
            verification_status,

        "ready_to_complete":
            ready_to_complete,

        "expected_count":
            len(expected_uids),

        "detected_count":
            len(detected_uids),

        "missing_items":
            missing_items,

        "unexpected_items":
            unexpected_items,

        "pre_op_captured":
            pre_op_captured,

        "post_op_captured":
            post_op_captured,

        "rfid_status":
            rfid_status,

        "cnn_status":
            cnn_status,
    }
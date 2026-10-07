import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Procedure, Verification
from ..schemas import (
    VerificationRequest,
    VerificationResponse
)

from ..services.rfid_service import rfid_service
from ..services.vision_service import vision_service
from ..services.reconciliation import reconcile


router = APIRouter(
    prefix="/verification",
    tags=["Verification"]
)


@router.post(
    "/run",
    response_model=VerificationResponse
)
def run_verification(
    request: VerificationRequest,
    db: Session = Depends(get_db)
):

    procedure = db.query(Procedure).filter(
        Procedure.id == request.procedure_id
    ).first()

    if not procedure:

        raise HTTPException(
            status_code=404,
            detail="Procedure not found"
        )

    expected_ids = json.loads(
        procedure.expected_instruments or "[]"
    )

    rfid_result = rfid_service.scan()

    rfid_tags = rfid_result["tags"]

    vision_items = []

    result = reconcile(
        expected=[
            str(item)
            for item in expected_ids
        ],
        rfid_detected=[
            str(item)
            for item in rfid_tags
        ],
        vision_detected=[
            str(item)
            for item in vision_items
        ]
    )

    verification = Verification(
        procedure_id=procedure.id,
        verification_type=request.verification_type,
        status=result["status"],
        missing_items=json.dumps(
            result["missing_items"]
        ),
        unexpected_items=json.dumps(
            result["unexpected_items"]
        ),
        details=json.dumps(result)
    )

    db.add(verification)
    db.commit()

    return result
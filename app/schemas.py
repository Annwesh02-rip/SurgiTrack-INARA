from datetime import datetime
from typing import Any, Optional

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
)


# =========================================================
# BASE ORM SCHEMA
# =========================================================

class ORMModel(BaseModel):

    model_config = ConfigDict(
        from_attributes=True
    )


# =========================================================
# AUTH / USER
# =========================================================

class UserCreate(BaseModel):

    name: str

    employee_id: str

    password: str

    role: str

    email: EmailStr


class UserLogin(BaseModel):

    employee_id: str

    password: str


class UserResponse(ORMModel):

    id: int

    name: str

    employee_id: str

    email: EmailStr

    role: str

    is_active: bool = True

    created_at: Optional[datetime] = None


class Token(BaseModel):

    access_token: str

    token_type: str = "bearer"

    user: UserResponse


# =========================================================
# PROCEDURES
# =========================================================

class ProcedureCreate(BaseModel):

    case_id: str

    procedure_name: str

    surgeon_name: str

    ot_room: str


class ProcedureStatusUpdate(BaseModel):

    status: str


class ProcedureResponse(ORMModel):

    id: int

    # Current SurgiTrack fields
    case_id: Optional[str] = None

    procedure_name: str

    surgeon_name: Optional[str] = None

    ot_room: Optional[str] = None

    status: str

    created_by: Optional[int] = None

    created_at: Optional[datetime] = None

    updated_at: Optional[datetime] = None

    # Backward-compatible fields
    patient_name: Optional[str] = None

    patient_id: Optional[str] = None

    operating_room: Optional[str] = None

    expected_instruments: Optional[str] = None


# =========================================================
# INSTRUMENTS
# =========================================================

class InstrumentCreate(BaseModel):

    # New SurgiTrack RFID workflow
    rfid_uid: Optional[str] = None

    name: str

    instrument_type: Optional[str] = None

    description: Optional[str] = None

    # Older route compatibility
    instrument_code: Optional[str] = None

    rfid_tag: Optional[str] = None

    category: Optional[str] = None


class InstrumentResponse(ORMModel):

    id: Optional[int] = None

    # Current RFID fields
    rfid_uid: Optional[str] = None

    name: str

    instrument_type: Optional[str] = None

    status: Optional[str] = None

    is_active: Optional[bool] = None

    description: Optional[str] = None

    # Older field compatibility
    instrument_code: Optional[str] = None

    rfid_tag: Optional[str] = None

    category: Optional[str] = None

    created_at: Optional[datetime] = None

    updated_at: Optional[datetime] = None


# =========================================================
# RFID
# =========================================================

class RFIDRegistrationRequest(BaseModel):

    rfid_uid: str


class ProcedureInstrumentResponse(ORMModel):

    link_id: Optional[int] = None

    procedure_id: int

    rfid_uid: Optional[str] = None

    name: Optional[str] = None

    instrument_type: Optional[str] = None

    expected: bool = True

    detected: bool = False


# =========================================================
# IMAGE
# =========================================================

class ImageResponse(ORMModel):

    id: int

    procedure_id: int

    image_path: str

    image_type: str

    uploaded_at: Optional[datetime] = None


# =========================================================
# CNN / COMPUTER VISION
# =========================================================

class VisionDetection(BaseModel):

    instrument: str

    confidence: Optional[float] = None

    detector: Optional[str] = None

    bbox: Optional[list[int]] = None

    region_index: Optional[int] = None


class VisionResult(BaseModel):

    detections: list[
        dict[str, Any]
    ] = Field(
        default_factory=list
    )

    counts: dict[
        str,
        int
    ] = Field(
        default_factory=dict
    )

    total: int = 0

    candidate_regions: int = 0

    models_run: int = 0

    errors: dict[
        str,
        str
    ] = Field(
        default_factory=dict
    )


class ImageUploadResponse(BaseModel):

    image: ImageResponse

    vision: VisionResult


# =========================================================
# VERIFICATION
# =========================================================

class VerificationRequest(BaseModel):

    procedure_id: int

    # Kept for compatibility with previous verification route
    verification_type: str = "combined"


class VerificationResponse(BaseModel):

    status: str

    ready_to_complete: bool = False

    expected_count: int = 0

    detected_count: int = 0

    missing_items: list[str] = Field(
        default_factory=list
    )

    unexpected_items: list[str] = Field(
        default_factory=list
    )

    pre_op_captured: bool = False

    post_op_captured: bool = False

    rfid_status: Optional[str] = None

    cnn_status: Optional[str] = None
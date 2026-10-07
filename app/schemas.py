from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# -------------------------
# AUTH
# -------------------------

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "staff"


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


# -------------------------
# INSTRUMENT
# -------------------------

class InstrumentCreate(BaseModel):
    name: str
    instrument_code: str
    rfid_tag: Optional[str] = None
    category: Optional[str] = None


class InstrumentResponse(BaseModel):
    id: int
    name: str
    instrument_code: str
    rfid_tag: Optional[str]
    category: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


# -------------------------
# PROCEDURE
# -------------------------

class ProcedureCreate(BaseModel):
    patient_name: str
    patient_id: Optional[str] = None
    procedure_name: str
    surgeon_name: Optional[str] = None
    operating_room: Optional[str] = None
    expected_instruments: Optional[list[int]] = None


class ProcedureResponse(BaseModel):
    id: int
    patient_name: str
    patient_id: Optional[str]
    procedure_name: str
    surgeon_name: Optional[str]
    operating_room: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# -------------------------
# VERIFICATION
# -------------------------

class VerificationRequest(BaseModel):
    procedure_id: int
    verification_type: str = "combined"


class VerificationResponse(BaseModel):
    status: str
    missing_items: list[str]
    unexpected_items: list[str]
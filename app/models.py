from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


# =========================================================
# USER
# =========================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(120),
        nullable=False,
    )

    employee_id = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    email = Column(
        String(180),
        unique=True,
        nullable=True,
        index=True,
    )

    hashed_password = Column(
        String(255),
        nullable=False,
    )

    role = Column(
        String(100),
        nullable=False,
        default="OT Technician",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    procedures = relationship(
        "Procedure",
        back_populates="created_by_user",
    )


# =========================================================
# INSTRUMENT INVENTORY
# =========================================================

class Instrument(Base):
    __tablename__ = "instruments"

    rfid_uid = Column(
        String(100),
        primary_key=True,
        nullable=False,
        index=True,
    )

    name = Column(
        String(100),
        nullable=False,
    )

    instrument_type = Column(
        String(100),
        nullable=False,
        index=True,
    )

    status = Column(
        String(50),
        nullable=False,
        default="available",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    description = Column(
        String(500),
        nullable=True,
    )

    procedure_links = relationship(
        "ProcedureInstrument",
        back_populates="instrument",
    )


# =========================================================
# PROCEDURE
# =========================================================

class Procedure(Base):
    __tablename__ = "procedures"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    case_id = Column(
        String(100),
        nullable=True,
        index=True,
    )

    procedure_name = Column(
        String(200),
        nullable=False,
    )

    # Kept for backward compatibility.
    patient_name = Column(
        String(200),
        nullable=True,
    )

    surgeon_name = Column(
        String(200),
        nullable=True,
    )

    ot_room = Column(
        String(100),
        nullable=True,
    )

    status = Column(
        String(50),
        nullable=False,
        default="created",
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    created_by_user = relationship(
        "User",
        back_populates="procedures",
    )

    instruments = relationship(
        "ProcedureInstrument",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )

    images = relationship(
        "ImageRecord",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )

    verifications = relationship(
        "Verification",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )

    events = relationship(
        "Event",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )


# =========================================================
# PROCEDURE <-> INSTRUMENT
# =========================================================

class ProcedureInstrument(Base):
    __tablename__ = "procedure_instruments"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    procedure_id = Column(
        Integer,
        ForeignKey("procedures.id"),
        nullable=False,
    )

    instrument_rfid_uid = Column(
        String(100),
        ForeignKey("instruments.rfid_uid"),
        nullable=False,
        index=True,
    )

    # Registered before procedure.
    expected = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    # Used later for final/post-op RFID checking.
    detected = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    procedure = relationship(
        "Procedure",
        back_populates="instruments",
    )

    instrument = relationship(
        "Instrument",
        back_populates="procedure_links",
    )


# =========================================================
# IMAGE RECORD
# =========================================================

class ImageRecord(Base):
    __tablename__ = "images"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    procedure_id = Column(
        Integer,
        ForeignKey("procedures.id"),
        nullable=False,
    )

    image_path = Column(
        String(500),
        nullable=False,
    )

    # pre_op or post_op
    image_type = Column(
        String(50),
        nullable=False,
    )

    uploaded_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    procedure = relationship(
        "Procedure",
        back_populates="images",
    )


# =========================================================
# VERIFICATION
# =========================================================

class Verification(Base):
    __tablename__ = "verifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    procedure_id = Column(
        Integer,
        ForeignKey("procedures.id"),
        nullable=False,
    )

    status = Column(
        String(50),
        nullable=False,
    )

    expected_count = Column(
        Integer,
        nullable=False,
        default=0,
    )

    detected_count = Column(
        Integer,
        nullable=False,
        default=0,
    )

    missing_count = Column(
        Integer,
        nullable=False,
        default=0,
    )

    extra_count = Column(
        Integer,
        nullable=False,
        default=0,
    )

    details = Column(
        Text,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    procedure = relationship(
        "Procedure",
        back_populates="verifications",
    )


# =========================================================
# EVENT
# =========================================================

class Event(Base):
    __tablename__ = "events"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    procedure_id = Column(
        Integer,
        ForeignKey("procedures.id"),
        nullable=True,
    )

    event_type = Column(
        String(100),
        nullable=False,
    )

    message = Column(
        Text,
        nullable=True,
    )

    instrument_rfid_uid = Column(
        String(100),
        nullable=True,
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    procedure = relationship(
        "Procedure",
        back_populates="events",
    )
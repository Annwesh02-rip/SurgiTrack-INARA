import os

from fastapi import FastAPI

from fastapi.middleware.cors import (
    CORSMiddleware,
)

from app.database import (
    Base,
    engine,
)

from app import models

from .routes import (
    auth,
    instruments,
    procedures,
    images,
    verification,
    events,
    rfid,
)


# =========================================================
# DATABASE
# =========================================================

Base.metadata.create_all(
    bind=engine
)


# =========================================================
# UPLOAD DIRECTORIES
# =========================================================

os.makedirs(
    "uploads/pre_op",
    exist_ok=True,
)

os.makedirs(
    "uploads/post_op",
    exist_ok=True,
)


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(

    title=(
        "SurgiTrack Backend"
    ),

    description=(
        "Backend API for surgical "
        "instrument tracking, "
        "RFID, computer vision and "
        "verification."
    ),

    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(

    CORSMiddleware,

    allow_origins=[
        "*"
    ],

    allow_credentials=True,

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],
)


# =========================================================
# ROUTERS
# =========================================================

app.include_router(
    auth.router
)

app.include_router(
    instruments.router
)

app.include_router(
    procedures.router
)

app.include_router(
    images.router
)

app.include_router(
    verification.router
)

app.include_router(
    events.router
)

app.include_router(
    rfid.router
)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():

    return {

        "message":
            "SurgiTrack Backend is running",

        "status":
            "online",
    }


# =========================================================
# HEALTH
# =========================================================

@app.get("/health")
def health():

    return {

        "status":
            "healthy",

        "vision_model_loaded":
            vision_service_status(),

        "rfid":
            rfid_service_status(),
    }


# =========================================================
# VISION STATUS
# =========================================================

def vision_service_status():

    try:

        from .services.vision_service import (
            vision_service,
        )

        return (
            vision_service.model_loaded
        )

    except Exception:

        return False


# =========================================================
# RFID STATUS
# =========================================================

def rfid_service_status():

    try:

        from .services.rfid_service import (
            rfid_service,
        )

        return (
            rfid_service.status()
        )

    except Exception as exc:

        return {

            "connected":
                False,

            "error":
                str(exc),
        }
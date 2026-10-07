import os
from app.database import Base, engine
from app import models
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine

from .routes import (
    auth,
    instruments,
    procedures,
    images,
    verification,
    events
)


# Create database tables
Base.metadata.create_all(
    bind=engine
)


# Create upload directories
os.makedirs(
    "../uploads/pre_op",
    exist_ok=True
)

os.makedirs(
    "../uploads/post_op",
    exist_ok=True
)


app = FastAPI(
    title="SurgiTrack Backend",
    description=(
        "Backend API for surgical instrument "
        "tracking and verification."
    ),
    version="1.0.0"
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Routers
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


@app.get("/")
def root():

    return {
        "message": "SurgiTrack Backend is running",
        "status": "online"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }
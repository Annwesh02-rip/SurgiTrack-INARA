from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker


# --------------------------------------------------
# PROJECT ROOT
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent


# --------------------------------------------------
# SQLITE DATABASE PATH
# --------------------------------------------------

DATABASE_PATH = BASE_DIR / "surgitrack.db"

print("========================================")
print("SURGITRACK DATABASE CONFIGURATION")
print("========================================")
print(f"Database path: {DATABASE_PATH}")
print("========================================")


# --------------------------------------------------
# DATABASE URL
# --------------------------------------------------

DATABASE_URL = f"sqlite:///{DATABASE_PATH}"


# --------------------------------------------------
# ENGINE
# --------------------------------------------------

engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False
    }
)


# --------------------------------------------------
# BASE
# --------------------------------------------------

Base = declarative_base()


# --------------------------------------------------
# SESSION
# --------------------------------------------------

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# --------------------------------------------------
# DATABASE DEPENDENCY
# --------------------------------------------------

def get_db():

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()
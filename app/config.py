from pathlib import Path

from pydantic_settings import BaseSettings


BASE_DIR = Path(__file__).resolve().parent.parent.parent

DATABASE_DIR = BASE_DIR / "database"

DATABASE_DIR.mkdir(
    parents=True,
    exist_ok=True
)


class Settings(BaseSettings):

    APP_NAME: str = "SurgiTrack Backend"

    DATABASE_URL: str = (
        f"sqlite:///{DATABASE_DIR / 'surgitrack.db'}"
    )

    SECRET_KEY: str = (
        "surgitrack-development-secret-key"
    )

    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    UPLOAD_DIR: str = str(
        BASE_DIR / "backend" / "uploads"
    )


settings = Settings()
from datetime import (
    datetime,
    timedelta,
    timezone,
)

import jwt

from fastapi import (
    Depends,
    HTTPException,
    status,
)

from fastapi.security import (
    OAuth2PasswordBearer,
)

from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User


# =========================================================
# PASSWORD HASHING
# =========================================================

password_hasher = (
    PasswordHash.recommended()
)


def hash_password(
    password: str,
) -> str:
    return password_hasher.hash(
        password
    )


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    return password_hasher.verify(
        plain_password,
        hashed_password,
    )


# =========================================================
# JWT
# =========================================================

# Swagger Authorize will now use /auth/token.
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/auth/token"
)


def create_access_token(
    user_id: int,
) -> str:
    expires_at = (
        datetime.now(
            timezone.utc
        )
        + timedelta(
            minutes=
            settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": str(user_id),
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


# =========================================================
# CURRENT USER
# =========================================================

def get_current_user(
    token: str = Depends(
        oauth2_scheme
    ),
    db: Session = Depends(
        get_db
    ),
) -> User:

    credentials_error = HTTPException(
        status_code=
            status.HTTP_401_UNAUTHORIZED,
        detail=(
            "Could not validate credentials"
        ),
        headers={
            "WWW-Authenticate":
                "Bearer"
        },
    )

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[
                settings.ALGORITHM
            ],
        )

        user_id = payload.get(
            "sub"
        )

        if not user_id:
            raise credentials_error

        user_id = int(
            user_id
        )

    except (
        jwt.InvalidTokenError,
        ValueError,
        TypeError,
    ):
        raise credentials_error

    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if user is None:
        raise credentials_error

    if not user.is_active:
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "User account is inactive"
            ),
        )

    return user
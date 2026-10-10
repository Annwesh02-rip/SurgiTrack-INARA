from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from fastapi.security import (
    OAuth2PasswordRequestForm,
)

from sqlalchemy.orm import Session

from ..auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)

from ..database import get_db
from ..models import User

from ..schemas import (
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


# =========================================================
# REGISTER
# =========================================================

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    user_data: UserCreate,
    db: Session = Depends(
        get_db
    ),
):

    employee_id = (
        user_data.employee_id
        .strip()
        .upper()
    )

    name = (
        user_data.name
        .strip()
    )

    role = (
        user_data.role
        .strip()
    )

    existing_employee = (
        db.query(User)
        .filter(
            User.employee_id
            == employee_id
        )
        .first()
    )

    if existing_employee:
        raise HTTPException(
            status_code=409,
            detail=(
                "Employee ID already registered"
            ),
        )

    if user_data.email:
        existing_email = (
            db.query(User)
            .filter(
                User.email
                == str(
                    user_data.email
                )
            )
            .first()
        )

        if existing_email:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Email already registered"
                ),
            )

    user = User(
        name=name,
        employee_id=employee_id,

        email=(
            str(user_data.email)
            if user_data.email
            else None
        ),

        hashed_password=
            hash_password(
                user_data.password
            ),

        role=role,
        is_active=True,
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)

    except Exception:
        db.rollback()
        raise

    return user


# =========================================================
# NORMAL JSON LOGIN
#
# React frontend uses this endpoint.
# =========================================================

@router.post(
    "/login",
    response_model=Token,
)
def login(
    credentials: UserLogin,
    db: Session = Depends(
        get_db
    ),
):

    employee_id = (
        credentials.employee_id
        .strip()
        .upper()
    )

    user = (
        db.query(User)
        .filter(
            User.employee_id
            == employee_id
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Invalid Employee ID or password"
            ),
        )

    if not verify_password(
        credentials.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Invalid Employee ID or password"
            ),
        )

    if not user.is_active:
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "User account is inactive"
            ),
        )

    access_token = (
        create_access_token(
            user.id
        )
    )

    return {
        "access_token":
            access_token,

        "token_type":
            "bearer",

        "user":
            user,
    }


# =========================================================
# SWAGGER OAUTH2 LOGIN
#
# Swagger sends:
#
# username = Employee ID
# password = Password
# =========================================================

@router.post(
    "/token"
)
def swagger_token(
    form_data:
        OAuth2PasswordRequestForm
        = Depends(),

    db: Session = Depends(
        get_db
    ),
):

    employee_id = (
        form_data.username
        .strip()
        .upper()
    )

    user = (
        db.query(User)
        .filter(
            User.employee_id
            == employee_id
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Invalid Employee ID or password"
            ),
        )

    if not verify_password(
        form_data.password,
        user.hashed_password,
    ):
        raise HTTPException(
            status_code=
                status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Invalid Employee ID or password"
            ),
        )

    if not user.is_active:
        raise HTTPException(
            status_code=
                status.HTTP_403_FORBIDDEN,
            detail=(
                "User account is inactive"
            ),
        )

    token = create_access_token(
        user.id
    )

    # Swagger expects exactly this structure.
    return {
        "access_token": token,
        "token_type": "bearer",
    }


# =========================================================
# CURRENT USER
# =========================================================

@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: User = Depends(
        get_current_user
    ),
):
    return current_user
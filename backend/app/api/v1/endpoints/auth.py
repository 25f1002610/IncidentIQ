from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from app.core.security import (
    create_access_token,
    get_current_user,
    TokenData,
    UserRole,
    verify_password,
    get_password_hash
)

router = APIRouter()

# Mock user database for authentication demonstration
MOCK_USERS = {
    "admin@incidentiq.com": {
        "username": "admin@incidentiq.com",
        "hashed_password": get_password_hash("AdminPass123!"),
        "role": UserRole.ADMIN
    },
    "operator@incidentiq.com": {
        "username": "operator@incidentiq.com",
        "hashed_password": get_password_hash("OperatorPass123!"),
        "role": UserRole.OPERATOR
    },
    "user@incidentiq.com": {
        "username": "user@incidentiq.com",
        "hashed_password": get_password_hash("UserPass123!"),
        "role": UserRole.USER
    }
}


class Token(BaseModel):
    access_token: str
    token_type: str
    role: UserRole


@router.post("/auth/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """Authenticate user credentials and issue JWT access token."""
    user = MOCK_USERS.get(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(subject=user["username"], role=user["role"])
    return Token(access_token=access_token, token_type="bearer", role=user["role"])


@router.get("/auth/me", response_model=TokenData)
async def read_users_me(current_user: TokenData = Depends(get_current_user)):
    """Retrieve details and role of current authenticated user."""
    return current_user

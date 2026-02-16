"""
Authentication endpoints for user registration, login, and profile management.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.db import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_user, get_current_active_user
from app.models.user import User
from app.schemas.auth import UserCreate, UserLogin, UserResponse, Token, UserWizardStateUpdate, SmartProfileUpdate, UserSearchResult
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.

    Args:
        user_data: User registration data
        db: Database session

    Returns:
        Created user data

    Raises:
        HTTPException: If email or username already exists
    """
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username already exists
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create new user
    new_user = User(
        id=str(uuid.uuid4()),
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        is_active=True,
        is_superuser=False
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login and get access token.

    Args:
        credentials: Login credentials (username/password)
        db: Database session

    Returns:
        JWT access token

    Raises:
        HTTPException: If credentials are invalid
    """
    # Find user by username
    user = db.query(User).filter(User.username == credentials.username).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Create access token
    access_token = create_access_token(data={"sub": user.id, "username": user.username})

    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """
    Get current authenticated user information.

    Args:
        current_user: Current authenticated user from dependency

    Returns:
        Current user data
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update current user profile.

    Args:
        user_update: Updated user data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated user data

    Raises:
        HTTPException: If email/username already exists for another user
    """
    # Check if new email is already taken by another user
    if user_update.email != current_user.email:
        existing_email = db.query(User).filter(
            User.email == user_update.email,
            User.id != current_user.id
        ).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

    # Check if new username is already taken by another user
    if user_update.username != current_user.username:
        existing_username = db.query(User).filter(
            User.username == user_update.username,
            User.id != current_user.id
        ).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

    # Update user fields
    current_user.email = user_update.email
    current_user.username = user_update.username
    current_user.full_name = user_update.full_name

    if user_update.password:
        current_user.hashed_password = get_password_hash(user_update.password)

    db.commit()
    db.refresh(current_user)

    return current_user


@router.patch("/me/wizard_state", response_model=UserResponse)
async def update_wizard_state(
    update_data: UserWizardStateUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update the user's wizard/reflection state.
    """
    # Simply replace the JSONB content
    current_user.wizard_state = update_data.wizard_state
    
    # We don't necessarily update 'updated_at' for this, or maybe we do?
    # Let's say yes, it's user activity.
    current_user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(current_user)
    
    return current_user


@router.get("/me/smart_profile")
async def get_smart_profile(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get the user's smart profile for personalized AI suggestions.
    Returns null if profile not yet completed.
    """
    return {"smart_profile": current_user.smart_profile}


@router.post("/me/smart_profile", response_model=UserResponse)
async def update_smart_profile(
    update_data: SmartProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create or update the user's smart profile.
    This profile is used to personalize AI suggestions in the wizard.
    """
    # Build the profile object with all 4 dimensions
    profile_data = {
        "profession": update_data.profession,  # Now a list (multi-select)
        "interests": update_data.interests,
        "level": update_data.level,
        "tools": update_data.tools,
        "completed": True,
        "created_at": datetime.utcnow().isoformat()
    }
    
    current_user.smart_profile = profile_data
    current_user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(current_user)
    
    return current_user


@router.get("/search", response_model=list[UserSearchResult])
async def search_users(
    q: str,
    limit: int = 5,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Search users by username or email.
    """
    if not q or len(q) < 2:
        return []
        
    query = db.query(User).filter(
        or_(
            User.username.ilike(f"%{q}%"),
            User.email.ilike(f"%{q}%"),
            User.full_name.ilike(f"%{q}%")
        )
    ).limit(limit)
    
    results = query.all()
    # Remove self from results
    return [u for u in results if u.id != current_user.id]


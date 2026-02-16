"""
Authentication schemas for request/response validation.
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime


class UserBase(BaseModel):
    """Base user schema with common fields."""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: str | None = None


class UserCreate(UserBase):
    """Schema for user registration."""
    password: str = Field(..., min_length=8, max_length=100)


class UserLogin(BaseModel):
    """Schema for user login."""
    username: str
    password: str


class SmartProfile(BaseModel):
    """Schema for user's smart profile used for personalized AI suggestions.

    Structure en 4 dimensions :
    1. Profession/Contexte (multi) : salarie, cadre, freelance, entrepreneur, liberal, investisseur, retraite, etudiant, reconversion
    2. Intérêts (multi) : finance_perso, business, investissement, immobilier, productivite, sante, ecologie, side_project
    3. Niveau : debutant, intermediaire, avance
    4. Outils (multi) : excel, notion, apps, mental, aucun
    """
    profession: list[str] = []  # Multi-select (ex: salarié + investisseur)
    interests: list[str] = []
    level: str | None = None
    tools: list[str] = []
    completed: bool = False
    created_at: datetime | None = None

    @field_validator('profession', 'interests', 'tools', mode='before')
    @classmethod
    def ensure_list(cls, v):
        """Convert string to list for backward compatibility with legacy data."""
        if v is None:
            return []
        if isinstance(v, str):
            return [v]
        return v


class SmartProfileUpdate(BaseModel):
    """Schema for updating user's smart profile."""
    profession: list[str] = []  # Multi-select
    interests: list[str] = []
    level: str | None = None
    tools: list[str] = []


class UserResponse(UserBase):
    """Schema for user data in responses."""
    id: str
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
    wizard_state: dict | None = None
    smart_profile: SmartProfile | None = None

    class Config:
        from_attributes = True


class UserWizardStateUpdate(BaseModel):
    """Schema for updating user wizard state."""
    wizard_state: dict | None


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for token payload data."""
    user_id: str | None = None
    username: str | None = None


class UserSearchResult(BaseModel):
    """Schema for public user search results."""
    id: str
    username: str
    email: EmailStr
    full_name: str | None = None

    class Config:
        from_attributes = True

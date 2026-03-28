from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

try:
    # SQLAlchemy 2.x
    from sqlalchemy.orm import DeclarativeBase
    class Base(DeclarativeBase):
        pass
except Exception:  # pragma: no cover - fallback for SQLAlchemy 1.4
    from sqlalchemy.orm import declarative_base
    Base = declarative_base()

from .config import settings


engine = create_engine(settings.db_url, pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db():
    """Dependency for FastAPI to get a database session."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

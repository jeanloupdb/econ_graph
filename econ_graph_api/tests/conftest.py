"""Pytest configuration and fixtures for testing."""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.core.db import Base, get_db
from app.main import app


# Use in-memory SQLite for testing
TEST_DATABASE_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def db_engine():
    """Create a test database engine."""
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a test database session."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database dependency override."""

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def sample_nodes_data():
    """Sample node data for testing."""
    return [
        {
            "id": "gdp_growth",
            "label": "GDP Growth Rate",
            "value_computed": 2.5,
            "unit": "percent",
            "plausible_range": [0, 10],
            "status": "observed",
            "confidence": 0.95,
        },
        {
            "id": "inflation",
            "label": "Inflation Rate",
            "value_computed": 3.2,
            "unit": "percent",
            "plausible_range": [-2, 15],
            "status": "observed",
            "confidence": 0.9,
        },
        {
            "id": "policy_rate",
            "label": "Policy Interest Rate",
            "value_computed": 5.0,
            "unit": "percent",
            "plausible_range": [0, 20],
            "status": "observed",
            "confidence": 1.0,
        },
    ]


@pytest.fixture
def fisher_nodes_data():
    """Sample nodes for Fisher identity testing."""
    return [
        {
            "id": "nominal_rate",
            "label": "Nominal Interest Rate",
            "value_computed": 5.0,
            "unit": "percent",
            "status": "observed",
            "confidence": 0.95,
        },
        {
            "id": "real_rate",
            "label": "Real Interest Rate",
            "value_computed": 2.0,
            "unit": "percent",
            "status": "observed",
            "confidence": 0.9,
        },
        {
            "id": "inflation_expected",
            "label": "Expected Inflation",
            "value_computed": 3.0,
            "unit": "percent",
            "status": "imposed",
            "confidence": 0.85,
        },
    ]

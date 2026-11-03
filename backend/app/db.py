"""
db.py — Database setup using SQLAlchemy async engine.

TODO:
  - Define ORM models (RideRequest, Driver, Recommendation, EvalResult)
  - Add Alembic migrations for production use
  - Switch DATABASE_URL to PostgreSQL for prod
"""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# ---------------------------------------------------------------------------
# Engine & session factory
# ---------------------------------------------------------------------------

engine = create_async_engine(
    settings.database_url,
    echo=settings.is_dev,   # Log SQL in dev mode
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ---------------------------------------------------------------------------
# Base class for ORM models
# ---------------------------------------------------------------------------

class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Dependency for FastAPI routes
# ---------------------------------------------------------------------------

async def get_db() -> AsyncSession:
    """
    FastAPI dependency that provides a database session per request.

    Usage in a route:
        async def my_route(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with AsyncSessionLocal() as session:
        yield session


# ---------------------------------------------------------------------------
# Init DB (create tables) — call on startup if not using Alembic
# ---------------------------------------------------------------------------

async def init_db() -> None:
    """Create all tables. For dev only — use Alembic migrations in prod."""
    # TODO: import all models here so Base.metadata knows about them
    # from app.models import ride_request, driver  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

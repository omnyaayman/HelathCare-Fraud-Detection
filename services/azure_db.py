from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from core.config import settings


# =========================
# ORM Base
# =========================
class Base(DeclarativeBase):
    pass


# =========================
# ENGINE (Azure SQL)
# =========================
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=300,
    echo=False,
    future=True
)


# =========================
# METADATA (Schema aware)
# =========================
metadata = MetaData(schema=settings.DB_SCHEMA)


# =========================
# SESSION FACTORY
# =========================
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    future=True
)
"""
SQLAlchemy engine + session dependency for FastAPI routes.

Reads DATABASE_URL from the environment (set in docker-compose.yml for
the containerized Postgres, or in .env for local dev against a Postgres
running outside Docker).
"""
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

load_dotenv()  # reads backend/.env into the process environment

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://researchgap:researchgap@localhost:5432/researchgap",
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """FastAPI dependency: yields a DB session, always closes it after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
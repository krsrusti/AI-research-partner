"""
SQLAlchemy models. Mirrors the schema in BUILD_PLAN.md section 3.

Note: there's no Row-Level Security here (that was the Supabase shortcut) --
every query in every router MUST filter by user_id explicitly. See auth.py
for the get_current_user dependency that supplies it.
"""
import uuid
from datetime import datetime, timezone

def utcnow():
    return datetime.now(timezone.utc)

from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, ARRAY, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=utcnow)

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)  # e.g. "Cryptocurrency Fraud Detection"
    created_at = Column(DateTime, default=utcnow)

    owner = relationship("User", back_populates="projects")
    papers = relationship("Paper", back_populates="project", cascade="all, delete-orphan")
    gaps = relationship("ResearchGap", back_populates="project", cascade="all, delete-orphan")


class Paper(Base):
    __tablename__ = "papers"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    authors = Column(String, nullable=True)
    year = Column(Integer, nullable=True)
    filename = Column(String, nullable=True)
    content_hash = Column(String, nullable=True, index=True)  # SHA256 of file bytes, for duplicate detection
    created_at = Column(DateTime, default=utcnow)

    __table_args__ = (
        # Same file can't be uploaded twice into the same project. Not global
        # (per-user or per-app) on purpose -- a paper legitimately relevant
        # to two different projects should be uploadable to both.
        UniqueConstraint("project_id", "content_hash", name="uq_paper_project_content_hash"),
    )

    project = relationship("Project", back_populates="papers")
    analysis = relationship("PaperAnalysis", back_populates="paper", uselist=False, cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="paper", cascade="all, delete-orphan")


class PaperAnalysis(Base):
    """Structured extraction -- Step 2 of the Research Gap Finder pipeline."""
    __tablename__ = "paper_analysis"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    paper_id = Column(UUID(as_uuid=False), ForeignKey("papers.id"), nullable=False, unique=True)
    problem = Column(Text, nullable=True)
    method = Column(String, nullable=True)      # e.g. "Random Forest", "GNN"
    dataset = Column(String, nullable=True)      # e.g. "Ethereum", "Elliptic Dataset"
    metrics = Column(String, nullable=True)      # e.g. "Accuracy, F1-score"
    results = Column(Text, nullable=True)
    limitations = Column(Text, nullable=True)
    future_work = Column(Text, nullable=True)

    paper = relationship("Paper", back_populates="analysis")


class Note(Base):
    __tablename__ = "notes"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    paper_id = Column(UUID(as_uuid=False), ForeignKey("papers.id"), nullable=False)
    user_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    highlighted_text = Column(Text, nullable=False)
    note_text = Column(Text, nullable=True)
    location = Column(String, nullable=True)  # e.g. page/offset, for jump-back-to-highlight
    created_at = Column(DateTime, default=utcnow)

    paper = relationship("Paper", back_populates="notes")


class ResearchGap(Base):
    """Output of Step 5 -- the gap report."""
    __tablename__ = "research_gaps"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    project_id = Column(UUID(as_uuid=False), ForeignKey("projects.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    related_paper_ids = Column(ARRAY(String), default=list)
    suggested_questions = Column(ARRAY(String), default=list)

    project = relationship("Project", back_populates="gaps")
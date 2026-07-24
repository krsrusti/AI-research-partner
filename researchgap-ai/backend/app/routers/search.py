"""
Cross-paper semantic search (Feature 4 in the project spec). Thin wrapper
around services/embeddings.py -- the actual retrieval logic lives there.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import User, Project
from app.services.embeddings import semantic_search

router = APIRouter(prefix="/search", tags=["search"])


class SearchRequest(BaseModel):
    project_id: str
    query: str
    n_results: int = 5


class SearchHit(BaseModel):
    text: str
    paper_id: str
    distance: float


@router.post("", response_model=list[SearchHit])
def search(
    payload: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Ownership check, same pattern as papers.py
    project = (
        db.query(Project)
        .filter(Project.id == payload.project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    hits = semantic_search(
        query=payload.query,
        user_id=current_user.id,
        project_id=payload.project_id,
        n_results=payload.n_results,
    )
    return hits
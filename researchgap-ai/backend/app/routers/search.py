"""
Cross-paper semantic search (Feature 4 in the project spec). Retrieves
the closest matching excerpts via services/embeddings.py, then generates
a short bullet-point summary answer from them (same pattern as chat.py),
plus returns the raw excerpts as sources.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import User, Project, Paper
from app.services.embeddings import semantic_search
from app.services.llm import generate_answer_points

router = APIRouter(prefix="/search", tags=["search"])

SEARCH_SUMMARY_PROMPT_TEMPLATE = """You are summarizing search results from a collection of research papers, \
for the query below, using ONLY the excerpts. If the excerpts don't really address the query, say so plainly \
in a single point -- do not use outside knowledge or guess.

EXCERPTS:
{excerpts}

QUERY: {query}

Return a JSON object: {{"answer_points": ["point 1", "point 2", ...]}}
Each point should be one concise, self-contained claim grounded in the excerpts. Use 2-5 points.
"""

N_RESULTS_DEFAULT = 5


class SearchRequest(BaseModel):
    project_id: str
    query: str
    n_results: int = N_RESULTS_DEFAULT


class SearchSource(BaseModel):
    paper_id: str
    paper_title: str
    text: str
    distance: float


class SearchResponse(BaseModel):
    answer_points: list[str]
    sources: list[SearchSource]


@router.post("", response_model=SearchResponse)
def search(
    payload: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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

    if not hits:
        return SearchResponse(
            answer_points=["No relevant passages were found in this project's papers."],
            sources=[],
        )

    paper_ids = list({h["paper_id"] for h in hits})
    papers_by_id = {p.id: p for p in db.query(Paper).filter(Paper.id.in_(paper_ids)).all()}

    excerpts_text = "\n\n".join(
        f"[Excerpt {i+1}, from \"{papers_by_id[h['paper_id']].title if h['paper_id'] in papers_by_id else 'Unknown'}\"]\n{h['text']}"
        for i, h in enumerate(hits)
    )
    prompt = SEARCH_SUMMARY_PROMPT_TEMPLATE.format(excerpts=excerpts_text, query=payload.query)

    answer_points = generate_answer_points(prompt)

    sources = [
        SearchSource(
            paper_id=h["paper_id"],
            paper_title=papers_by_id[h["paper_id"]].title if h["paper_id"] in papers_by_id else "Unknown",
            text=h["text"],
            distance=h["distance"],
        )
        for h in hits
    ]

    return SearchResponse(answer_points=answer_points, sources=sources)
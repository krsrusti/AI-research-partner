"""
Papers router -- Pass 1: upload, extract text, chunk, save paper record.
Embeddings (Pass 2) and Gemini structured analysis (Pass 3) are layered
in on top of this once this slice is confirmed working.
"""
import hashlib
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import User, Project, Paper, PaperAnalysis
from app.services.pdf_processing import extract_and_chunk
from app.services.embeddings import embed_and_store, delete_paper_vectors
from app.services.extraction import extract_structured_fields
from app.services.file_storage import save_paper_file, get_paper_file_path, delete_paper_file

router = APIRouter(prefix="/papers", tags=["papers"])

MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB


class PaperOut(BaseModel):
    id: str
    title: str
    authors: str | None
    year: int | None
    filename: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class PaperAnalysisOut(BaseModel):
    problem: str | None
    method: str | None
    dataset: str | None
    metrics: str | None
    results: str | None
    limitations: str | None
    future_work: str | None

    class Config:
        from_attributes = True


class PaperUploadResult(BaseModel):
    paper: PaperOut
    chunk_count: int  # confirms extraction actually worked
    analysis: PaperAnalysisOut


@router.post("/upload", response_model=PaperUploadResult)
async def upload_paper(
    project_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Ownership check -- can't upload into a project that isn't yours
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 25MB)")

    content_hash = hashlib.sha256(raw_bytes).hexdigest()

    # Check BEFORE doing any extraction/embedding/LLM work -- those are the
    # expensive/costly steps, no point running them just to hit the DB
    # constraint afterward.
    existing = (
        db.query(Paper)
        .filter(Paper.project_id == project.id, Paper.content_hash == content_hash)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"This exact file was already uploaded to this project as '{existing.filename}' "
                   f"(paper id: {existing.id})",
        )

    try:
        chunks, metadata = extract_and_chunk(raw_bytes, filename=file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    paper = Paper(
        project_id=project.id,
        user_id=current_user.id,
        title=metadata["title"],
        authors=metadata["authors"],
        year=metadata["year"],
        filename=file.filename,
        content_hash=content_hash,
    )
    db.add(paper)
    try:
        db.commit()
    except IntegrityError:
        # Race-condition safety net: two near-simultaneous uploads of the same
        # file both passed the check above before either committed. The
        # earlier check handles the common case; this handles the rare one.
        db.rollback()
        raise HTTPException(status_code=409, detail="This exact file was already uploaded to this project")
    db.refresh(paper)

    save_paper_file(paper.id, raw_bytes)

    embed_and_store(chunks, paper_id=paper.id, project_id=paper.project_id, user_id=current_user.id)

    structured = extract_structured_fields(chunks)
    llm_title = structured.pop("title", None)  # not a paper_analysis column -- belongs on Paper
    if llm_title:
        paper.title = llm_title
        db.commit()
        db.refresh(paper)

    analysis = PaperAnalysis(paper_id=paper.id, **structured)
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return PaperUploadResult(paper=paper, chunk_count=len(chunks), analysis=analysis)


@router.get("/{paper_id}/analysis", response_model=PaperAnalysisOut)
def get_paper_analysis(
    paper_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    paper = (
        db.query(Paper)
        .filter(Paper.id == paper_id, Paper.user_id == current_user.id)
        .first()
    )
    if not paper or not paper.analysis:
        raise HTTPException(status_code=404, detail="Paper or analysis not found")

    return paper.analysis


@router.get("/{paper_id}/file")
def get_paper_file(
    paper_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Serves the original uploaded PDF, for the split-screen reader view.
    Requires an authenticated request (Authorization header), same as
    every other endpoint -- the frontend fetches this as a blob rather
    than pointing an <iframe src> directly at it, since iframes can't
    attach auth headers."""
    paper = (
        db.query(Paper)
        .filter(Paper.id == paper_id, Paper.user_id == current_user.id)
        .first()
    )
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    file_path = get_paper_file_path(paper_id)
    if not file_path:
        raise HTTPException(status_code=404, detail="Original file not found (may predate file storage)")

    return FileResponse(file_path, media_type="application/pdf", filename=paper.filename or "paper.pdf")


@router.get("/{project_id}", response_model=list[PaperOut])
def list_papers(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Ownership check on the project (not just the papers) -- otherwise a user
    # could enumerate another user's project_id and see paper titles/metadata.
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return (
        db.query(Paper)
        .filter(Paper.project_id == project_id, Paper.user_id == current_user.id)
        .order_by(Paper.created_at.desc())
        .all()
    )


@router.delete("/{paper_id}")
def delete_paper(
    paper_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    paper = (
        db.query(Paper)
        .filter(Paper.id == paper_id, Paper.user_id == current_user.id)
        .first()
    )
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    db.delete(paper)
    db.commit()
    delete_paper_vectors(paper_id=paper_id, user_id=current_user.id)
    delete_paper_file(paper_id)
    return {"deleted": paper_id}
"""
Smart Notes (Feature 3 in the project spec): highlight text in a paper,
attach a note to it, edit/delete/search. Straightforward CRUD, scoped to
the current user throughout -- same ownership discipline as everywhere
else in this app.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import User, Paper, Note

router = APIRouter(prefix="/notes", tags=["notes"])


class NoteCreate(BaseModel):
    paper_id: str
    highlighted_text: str
    note_text: str | None = None
    location: str | None = None


class NoteUpdate(BaseModel):
    note_text: str | None = None


class NoteOut(BaseModel):
    id: str
    paper_id: str
    highlighted_text: str
    note_text: str | None
    location: str | None
    created_at: datetime

    class Config:
        from_attributes = True


def _get_owned_note(note_id: str, current_user: User, db: Session) -> Note:
    note = (
        db.query(Note)
        .filter(Note.id == note_id, Note.user_id == current_user.id)
        .first()
    )
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.post("", response_model=NoteOut)
def create_note(
    payload: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.highlighted_text.strip():
        raise HTTPException(status_code=400, detail="Highlighted text cannot be empty")

    # Ownership check on the paper -- can't attach a note to someone else's paper
    paper = (
        db.query(Paper)
        .filter(Paper.id == payload.paper_id, Paper.user_id == current_user.id)
        .first()
    )
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    note = Note(
        paper_id=paper.id,
        user_id=current_user.id,
        highlighted_text=payload.highlighted_text,
        note_text=payload.note_text,
        location=payload.location,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.get("/{paper_id}", response_model=list[NoteOut])
def list_notes(
    paper_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Ownership check on the paper, not just the notes -- same pattern as
    # papers.py's list endpoint, so a user can't even discover notes exist
    # by guessing a paper_id they don't own.
    paper = (
        db.query(Paper)
        .filter(Paper.id == paper_id, Paper.user_id == current_user.id)
        .first()
    )
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    return (
        db.query(Note)
        .filter(Note.paper_id == paper_id, Note.user_id == current_user.id)
        .order_by(Note.created_at.desc())
        .all()
    )


@router.put("/{note_id}", response_model=NoteOut)
def update_note(
    note_id: str,
    payload: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = _get_owned_note(note_id, current_user, db)
    if payload.note_text is not None:
        note.note_text = payload.note_text
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}")
def delete_note(
    note_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    note = _get_owned_note(note_id, current_user, db)
    db.delete(note)
    db.commit()
    return {"deleted": note_id}
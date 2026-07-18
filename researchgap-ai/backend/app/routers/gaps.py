"""
Research Gap Finder endpoints (Steps 3-5 of the spec). Thin layer over
services/gap_finder.py -- this file handles DB fetch/persist and
ownership checks; the actual aggregation/LLM logic lives in the service.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import User, Project, Paper, ResearchGap
from app.services.gap_finder import generate_gap_report, MIN_PAPERS_FOR_GAP_REPORT

router = APIRouter(prefix="/gaps", tags=["gaps"])


class GapOut(BaseModel):
    id: str
    title: str
    description: str | None
    related_paper_ids: list[str]
    suggested_questions: list[str]

    class Config:
        from_attributes = True


class GenerateGapReportResult(BaseModel):
    common_trends: list[str]
    common_limitations: list[str]
    stats: dict
    gaps: list[GapOut]


def _get_owned_project(project_id: str, current_user: User, db: Session) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/generate/{project_id}", response_model=GenerateGapReportResult)
def generate(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_owned_project(project_id, current_user, db)

    papers = (
        db.query(Paper)
        .filter(Paper.project_id == project.id, Paper.user_id == current_user.id)
        .all()
    )
    papers_with_analysis = [
        {"paper_id": p.id, "analysis": {
            "method": p.analysis.method,
            "dataset": p.analysis.dataset,
            "limitations": p.analysis.limitations,
        }}
        for p in papers if p.analysis is not None
    ]

    if len(papers_with_analysis) < MIN_PAPERS_FOR_GAP_REPORT:
        raise HTTPException(
            status_code=400,
            detail=f"Need at least {MIN_PAPERS_FOR_GAP_REPORT} analyzed papers in this project "
                   f"to generate a gap report (have {len(papers_with_analysis)})",
        )

    report = generate_gap_report(papers_with_analysis)

    # Regenerating replaces the previous report -- simplest correct behavior;
    # a version-history feature could keep old ones instead, if wanted later.
    db.query(ResearchGap).filter(ResearchGap.project_id == project.id).delete()

    saved_gaps = []
    for g in report["gaps"]:
        gap = ResearchGap(
            project_id=project.id,
            title=g["title"],
            description=g["description"],
            related_paper_ids=g["related_paper_ids"],
            suggested_questions=g["suggested_questions"],
        )
        db.add(gap)
        saved_gaps.append(gap)
    db.commit()
    for g in saved_gaps:
        db.refresh(g)

    return GenerateGapReportResult(
        common_trends=report["common_trends"],
        common_limitations=report["common_limitations"],
        stats=report["stats"],
        gaps=saved_gaps,
    )


@router.get("/{project_id}", response_model=list[GapOut])
def get_gaps(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = _get_owned_project(project_id, current_user, db)
    return db.query(ResearchGap).filter(ResearchGap.project_id == project.id).all()
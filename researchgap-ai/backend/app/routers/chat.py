"""
RAG chat (Feature 2 in the project spec): ask a question, get an answer
grounded in the actual paper text via semantic search, with sources cited.
Deliberately instructs the LLM to answer ONLY from the retrieved chunks,
to reduce hallucination -- if nothing relevant is retrieved, it says so
rather than guessing from general knowledge.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import User, Project, Paper
from app.services.embeddings import semantic_search
from app.services import llm

router = APIRouter(prefix="/chat", tags=["chat"])

CHAT_PROMPT_TEMPLATE = """You are answering a question about a collection of research papers, using ONLY \
the excerpts below. If the excerpts don't contain enough information to answer, say so plainly -- \
do not use outside knowledge or guess.

EXCERPTS:
{excerpts}

QUESTION: {question}

Answer concisely, grounded only in the excerpts above.
"""

N_CHUNKS_FOR_CONTEXT = 5


class ChatRequest(BaseModel):
    project_id: str
    question: str


class ChatSource(BaseModel):
    paper_id: str
    paper_title: str
    text_snippet: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[ChatSource]


@router.post("", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    project = (
        db.query(Project)
        .filter(Project.id == payload.project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    hits = semantic_search(
        query=payload.question,
        user_id=current_user.id,
        project_id=payload.project_id,
        n_results=N_CHUNKS_FOR_CONTEXT,
    )

    if not hits:
        return ChatResponse(
            answer="I couldn't find anything relevant in this project's papers to answer that.",
            sources=[],
        )

    # Look up paper titles for the sources (semantic_search only returns paper_id)
    paper_ids = list({h["paper_id"] for h in hits})
    papers_by_id = {
        p.id: p for p in db.query(Paper).filter(Paper.id.in_(paper_ids)).all()
    }

    excerpts_text = "\n\n".join(
        f"[Source {i+1}, from \"{papers_by_id[h['paper_id']].title if h['paper_id'] in papers_by_id else 'Unknown'}\"]\n{h['text']}"
        for i, h in enumerate(hits)
    )
    prompt = CHAT_PROMPT_TEMPLATE.format(excerpts=excerpts_text, question=payload.question)

    answer = llm.generate_text(prompt)

    sources = [
        ChatSource(
            paper_id=h["paper_id"],
            paper_title=papers_by_id[h["paper_id"]].title if h["paper_id"] in papers_by_id else "Unknown",
            text_snippet=h["text"][:280],
        )
        for h in hits
    ]

    return ChatResponse(answer=answer, sources=sources)
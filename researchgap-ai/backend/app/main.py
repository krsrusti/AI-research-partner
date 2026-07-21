"""
FastAPI entrypoint. Mounts all routers and configures CORS for the
frontend dev server.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, projects, papers, search, gaps, graph, notes

# TODO: from app.routers import chat

app = FastAPI(title="ResearchGap AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(papers.router)
app.include_router(search.router)
app.include_router(gaps.router)
app.include_router(graph.router)
app.include_router(notes.router)

# TODO: app.include_router(chat.router)


@app.get("/health")
def health():
    return {"status": "ok"}
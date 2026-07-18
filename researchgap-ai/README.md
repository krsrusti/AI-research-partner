# ResearchGap AI

Scaffold for an AI platform that analyzes collections of research papers to find research gaps.
See BUILD_PLAN.md (project root, provided separately) for full architecture, schema, and roadmap.

## Quick start

### Backend

```
cd backend
cp .env.example .env   # fill in GEMINI_API_KEY etc.
docker compose up -d postgres   # from repo root
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```
cd frontend
npm install
npm run dev
```

## Status

Files marked TODO are stubs — see the file structure walkthrough for what's built vs. planned.
Currently implemented: PDF processing service, papers/graph routers (need updating from
Supabase to SQLAlemy), Docker Compose + Dockerfile, full frontend scaffold with
react-three-fiber / react-force-graph-3d wired in.

Not yet implemented: models.py, database.py, security.py, auth.py, and the auth/projects/chat/
notes/gaps routers (currently empty stubs).

http://127.0.0.1:8000/docs
python -m uvicorn app.main:app --reload

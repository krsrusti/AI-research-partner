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






http://127.0.0.1:8000/docs
python -m uvicorn app.main:app --reload

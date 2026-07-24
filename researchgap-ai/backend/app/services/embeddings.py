"""
Pass 2: embeddings + vector storage/search via ChromaDB, using a local
sentence-transformers model (no API cost, no network dependency at runtime
once the model's downloaded once). Kept separate from pdf_processing.py so
Pass 1 (extraction/chunking) stays testable without pulling in these
heavier ML dependencies.

Collections are namespaced per-user (`user_{user_id}`) so one user's RAG
search can never surface another user's paper content -- the same
discipline as the explicit user_id filters everywhere else in this app.
"""
import chromadb
from sentence_transformers import SentenceTransformer

from app.core.config import settings

_embedder: SentenceTransformer | None = None
_chroma_client: chromadb.ClientAPI | None = None


def _get_embedder() -> SentenceTransformer:
    """Lazy-loaded so importing this module doesn't force a model download
    (e.g. during simple test collection or when Pass 1 tests don't need it)."""
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedder


def _get_chroma() -> chromadb.ClientAPI:
    global _chroma_client
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
    return _chroma_client


def embed_and_store(chunks: list[str], paper_id: str, project_id: str, user_id: str) -> int:
    """Embeds each chunk and stores it in the user's ChromaDB collection,
    tagged with project_id so searches can be scoped to one project --
    without this, a user with papers in multiple projects would get
    search/chat results bleeding across projects."""
    if not chunks:
        return 0

    collection = _get_chroma().get_or_create_collection(name=f"user_{user_id}")
    embeddings = _get_embedder().encode(chunks).tolist()
    collection.add(
        ids=[f"{paper_id}_{i}" for i in range(len(chunks))],
        embeddings=embeddings,
        documents=chunks,
        metadatas=[{"paper_id": paper_id, "project_id": project_id} for _ in chunks],
    )
    return len(chunks)


def semantic_search(
    query: str,
    user_id: str,
    project_id: str,
    n_results: int = 5,
    paper_id: str | None = None,
) -> list[dict]:
    """Returns a list of {text, paper_id, distance} dicts, closest first.
    Always scoped to project_id -- optionally further narrowed to one paper_id."""
    collection = _get_chroma().get_or_create_collection(name=f"user_{user_id}")
    if collection.count() == 0:
        return []

    query_embedding = _get_embedder().encode([query]).tolist()
    if paper_id:
        where = {"$and": [{"project_id": project_id}, {"paper_id": paper_id}]}
    else:
        where = {"project_id": project_id}

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(n_results, collection.count()),
        where=where,
    )

    hits = []
    documents = results.get("documents") or [[]]
    metadatas = results.get("metadatas") or [[]]
    distances = results.get("distances") or [[]]
    for text, meta, distance in zip(documents[0], metadatas[0], distances[0]):
        hits.append({"text": text, "paper_id": meta["paper_id"], "distance": distance})
    return hits


def delete_paper_vectors(paper_id: str, user_id: str) -> None:
    """Removes all chunks for a paper -- call this when a paper is deleted,
    so orphaned vectors don't linger in ChromaDB."""
    collection = _get_chroma().get_or_create_collection(name=f"user_{user_id}")
    collection.delete(where={"paper_id": paper_id})
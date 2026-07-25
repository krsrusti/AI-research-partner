"""
Raw PDF file storage on local disk, keyed by paper_id. Separate from
pdf_processing.py (which only cares about extracted text) -- this is
purely so the original file can be re-served later for the split-screen
PDF-reader-plus-notes view.
"""
import os

from app.core.config import settings


def _paper_file_path(paper_id: str) -> str:
    return os.path.join(settings.paper_storage_dir, f"{paper_id}.pdf")


def save_paper_file(paper_id: str, raw_bytes: bytes) -> None:
    os.makedirs(settings.paper_storage_dir, exist_ok=True)
    with open(_paper_file_path(paper_id), "wb") as f:
        f.write(raw_bytes)


def get_paper_file_path(paper_id: str) -> str | None:
    path = _paper_file_path(paper_id)
    return path if os.path.exists(path) else None


def delete_paper_file(paper_id: str) -> None:
    path = _paper_file_path(paper_id)
    if os.path.exists(path):
        os.remove(path)
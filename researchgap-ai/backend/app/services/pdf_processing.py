"""
Pass 1: PDF text extraction + chunking. PyMuPDF only -- deliberately has
no ChromaDB/embedding dependency, so this can be tested without pulling
in the heavier ML packages (see services/embeddings.py for Pass 2).
"""
import fitz  # PyMuPDF


def extract_and_chunk(
    raw_bytes: bytes,
    filename: str,
    chunk_size: int = 800,
    overlap: int = 150,
) -> tuple[list[str], dict]:
    """
    Extracts full text from a PDF and splits it into overlapping word-count
    chunks (simple and fast; swap for a token-aware splitter later if chunk
    boundaries start cutting sentences awkwardly for the LLM).

    Returns (chunks, metadata) where metadata is a naive first-pass guess
    at title/authors/year -- good enough to display something in the UI
    immediately; the real structured extraction happens later via Gemini
    (services/extraction.py, Pass 3) and overwrites this.
    """
    doc = fitz.open(stream=raw_bytes, filetype="pdf")
    full_text = "\n".join(page.get_text() for page in doc)
    pdf_metadata_title = (doc.metadata or {}).get("title", "").strip()
    doc.close()

    if not full_text.strip():
        raise ValueError("No extractable text found in PDF (may be a scanned/image-only PDF)")

    lines = [l.strip() for l in full_text.splitlines() if l.strip()]
    # Prefer the PDF's own embedded metadata title (published papers usually
    # have this set correctly) over the first-line heuristic, which often
    # grabs a publisher header ("ScienceDirect", journal name, etc.) instead
    # of the actual paper title.
    first_line_title = lines[0] if lines else filename
    metadata = {
        "title": pdf_metadata_title if pdf_metadata_title else first_line_title,
        "authors": None,
        "year": None,
    }

    words = full_text.split()
    step = max(chunk_size - overlap, 1)  # guard against overlap >= chunk_size
    chunks = [
        " ".join(words[i:i + chunk_size])
        for i in range(0, len(words), step)
    ]
    return chunks, metadata
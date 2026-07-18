"""
Pass 3: structured extraction (Step 2 of the Research Gap Finder pipeline
in the project spec). Calls Gemini once per paper to pull out
problem/method/dataset/metrics/results/limitations/future_work as
structured fields, instead of just storing raw text -- this structured
data is what the graph, gap-finder, and pattern aggregation all build on.
"""
import json
import logging

from app.services import llm

logger = logging.getLogger(__name__)

EXTRACTION_PROMPT_TEMPLATE = """You are analyzing an academic research paper. Based on the text below \
(which may be truncated/chunked), extract the following fields as a JSON object:

- "title": the paper's actual title, cleaned up (fix line-wrap artifacts, remove publisher/journal headers like "ScienceDirect" if mistakenly included)
- "problem": the research problem/question being addressed (1-2 sentences)
- "method": the primary method/model/approach used (short phrase, e.g. "Random Forest", "Graph Neural Network")
- "dataset": the primary dataset(s) used (short phrase, e.g. "Ethereum transaction data", "Elliptic Dataset")
- "metrics": evaluation metrics used, comma-separated (e.g. "Accuracy, F1-score, Precision")
- "results": key results/findings (1-2 sentences)
- "limitations": limitations the paper acknowledges (1-2 sentences)
- "future_work": suggested future work, if mentioned (1-2 sentences)

If a field genuinely cannot be determined from the text, use null for that field.
Return ONLY the JSON object, no other text.

PAPER TEXT:
{text}
"""

# Gemini 2.0 Flash's context window comfortably fits this many characters
# for most papers; chunks beyond this are dropped from the extraction
# prompt specifically (full text is still embedded/searchable via Pass 2).
MAX_CHARS_FOR_EXTRACTION = 30_000

REQUIRED_FIELDS = ["title", "problem", "method", "dataset", "metrics", "results", "limitations", "future_work"]


def extract_structured_fields(chunks: list[str]) -> dict:
    """
    Runs Gemini once over the paper's (possibly truncated) text and returns
    a dict with the 7 fields above. Falls back to all-None fields if the
    LLM call fails or returns malformed JSON, rather than raising --
    upload should still succeed even if structured extraction has a hiccup;
    the paper is still searchable via embeddings regardless.
    """
    full_text = " ".join(chunks)[:MAX_CHARS_FOR_EXTRACTION]
    prompt = EXTRACTION_PROMPT_TEMPLATE.format(text=full_text)

    try:
        raw_response = llm.generate_json(prompt)
        parsed = json.loads(raw_response)
    except Exception as e:
        logger.error("Structured extraction failed: %s", e, exc_info=True)
        return {field: None for field in REQUIRED_FIELDS}

    # Defensive: only keep the fields we expect, default missing ones to None,
    # so a malformed/partial LLM response can't inject unexpected DB columns.
    return {field: parsed.get(field) for field in REQUIRED_FIELDS}
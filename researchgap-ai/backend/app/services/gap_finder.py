"""
Aggregates paper_analysis rows across a project, computes pattern stats
(e.g. "80% used Ethereum"), and calls Gemini to generate the gap report
(common trends, limitations, potential gaps, suggested research questions).
"""
"""
Pass 4: the Research Gap Finder itself (Steps 3-5 in the project spec).
Aggregates paper_analysis across a project, computes pattern stats (e.g.
"80% used supervised learning"), and calls the LLM once over that
aggregated summary to generate the gap report.

Deliberately ONE LLM call over the aggregated data, not one per paper
(that already happened in extraction.py) -- cheaper, and gives the LLM
the full cross-paper picture at once instead of trying to synthesize
from N separate calls.

Each identified gap includes which specific papers it relates to
(related_paper_ids) -- this is what the 3D graph's gap nodes/edges will
be built from later, so it needs real paper IDs, not just a text summary.
"""
import json
import logging
from collections import Counter

from app.services import llm

logger = logging.getLogger(__name__)

MIN_PAPERS_FOR_GAP_REPORT = 2  # a "gap" needs at least 2 papers to compare against

GAP_REPORT_PROMPT_TEMPLATE = """You are a research assistant helping a researcher identify gaps in a body \
of literature. Below is a numbered list of {paper_count} papers on a related topic, including the \
methods, datasets, and limitations each one reports, plus computed frequency statistics.

Based on this, generate a JSON object with these fields:

- "common_trends": array of 2-4 short strings describing patterns across the papers (e.g. "Most studies use Ethereum transaction data")
- "common_limitations": array of 2-4 short strings describing limitations that recur across multiple papers
- "potential_gaps": array of 2-5 objects, each with:
    - "title": short name for the gap (e.g. "Cross-chain fraud detection")
    - "description": 1-2 sentences explaining what's missing and why it matters
    - "related_paper_numbers": array of the paper numbers (integers, from the numbered list below) this gap relates to
    - "suggested_questions": array of 1-2 specific, answerable research questions for this particular gap

Ground every claim in the data below -- don't invent trends or gaps that aren't reflected in the papers.
Every gap's related_paper_numbers must reference real paper numbers from the list below.

NUMBERED PAPER LIST:
{numbered_papers}

METHOD FREQUENCY (%): {method_percentages}
DATASET FREQUENCY (%): {dataset_percentages}

Return ONLY the JSON object, no other text.
"""


def compute_pattern_stats(analyses: list[dict]) -> dict:
    """
    Step 4: pure computation, no LLM call. Frequency counts for
    method/dataset so the UI (and the gap-report prompt) can show things
    like "80% used Ethereum" without relying on the LLM to do arithmetic,
    which it's unreliable at.
    """
    total = len(analyses)
    method_counts = Counter(a["method"] for a in analyses if a.get("method"))
    dataset_counts = Counter(a["dataset"] for a in analyses if a.get("dataset"))

    return {
        "total_papers": total,
        "method_counts": dict(method_counts),
        "dataset_counts": dict(dataset_counts),
        "method_percentages": {k: round(v / total * 100) for k, v in method_counts.items()} if total else {},
        "dataset_percentages": {k: round(v / total * 100) for k, v in dataset_counts.items()} if total else {},
    }


def _format_numbered_papers(papers: list[dict]) -> str:
    """papers: list of {"paper_id": ..., "analysis": {...}} dicts.
    Numbers papers 1..N for the prompt so the LLM can reference them by
    number in related_paper_numbers, which we then map back to real IDs."""
    lines = []
    for i, p in enumerate(papers, 1):
        a = p["analysis"]
        lines.append(
            f"{i}. method={a.get('method') or 'unknown'}, "
            f"dataset={a.get('dataset') or 'unknown'}, "
            f"limitations={a.get('limitations') or 'none stated'}"
        )
    return "\n".join(lines)


def generate_gap_report(papers: list[dict]) -> dict:
    """
    papers: list of {"paper_id": str, "analysis": dict} -- one per paper
    in the project with a completed paper_analysis row.

    Returns a dict with:
      - stats: output of compute_pattern_stats
      - common_trends: list[str]
      - common_limitations: list[str]
      - gaps: list of {title, description, related_paper_ids, suggested_questions}
              (related_paper_ids are REAL paper IDs, already mapped back from
              the LLM's paper-number references)

    Falls back to empty lists/gaps if the LLM call fails or returns
    malformed JSON, same defensive pattern as extraction.py.
    """
    if len(papers) < MIN_PAPERS_FOR_GAP_REPORT:
        raise ValueError(
            f"Need at least {MIN_PAPERS_FOR_GAP_REPORT} papers with analysis to generate a gap report "
            f"(got {len(papers)})"
        )

    analyses = [p["analysis"] for p in papers]
    stats = compute_pattern_stats(analyses)

    prompt = GAP_REPORT_PROMPT_TEMPLATE.format(
        paper_count=stats["total_papers"],
        numbered_papers=_format_numbered_papers(papers),
        method_percentages=stats["method_percentages"],
        dataset_percentages=stats["dataset_percentages"],
    )

    try:
        raw_response = llm.generate_json(prompt)
        parsed = json.loads(raw_response)
    except Exception as e:
        logger.error("Gap report generation failed: %s", e, exc_info=True)
        parsed = {}

    common_trends = parsed.get("common_trends") or []
    common_limitations = parsed.get("common_limitations") or []
    raw_gaps = parsed.get("potential_gaps") or []

    # paper number (1-indexed, as given to the LLM) -> real paper_id
    number_to_id = {i: p["paper_id"] for i, p in enumerate(papers, 1)}

    gaps = []
    for g in raw_gaps:
        if not isinstance(g, dict) or not g.get("title"):
            continue  # skip malformed entries rather than crash the whole report
        numbers = g.get("related_paper_numbers") or []
        related_ids = [number_to_id[n] for n in numbers if n in number_to_id]
        gaps.append({
            "title": g["title"],
            "description": g.get("description"),
            "related_paper_ids": related_ids,
            "suggested_questions": g.get("suggested_questions") or [],
        })

    return {
        "stats": stats,
        "common_trends": common_trends,
        "common_limitations": common_limitations,
        "gaps": gaps,
    }
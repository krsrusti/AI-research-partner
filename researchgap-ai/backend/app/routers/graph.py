from fastapi import APIRouter, Depends
from supabase import Client
from collections import defaultdict

from app.core.auth import get_user_scoped_client

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/{project_id}")
async def get_graph(project_id: str, db: Client = Depends(get_user_scoped_client)):
    """
    Builds the node/edge data for the 3D graph directly from the structured
    paper analysis (method/dataset/limitations per paper). This is why the
    Research Gap Finder's structured extraction step matters -- the graph
    is a free byproduct of that data, not separately computed.

    Returns:
      nodes: [{id, type: 'paper'|'gap', label, ...}]
      edges: [{source, target, relation: 'shares_dataset'|'shares_method'|'addresses_gap'}]
    """
    papers = db.table("papers").select("id, title").eq("project_id", project_id).execute().data
    analyses = db.table("paper_analysis").select("*").in_(
        "paper_id", [p["id"] for p in papers]
    ).execute().data if papers else []

    analysis_by_paper = {a["paper_id"]: a for a in analyses}

    nodes = [
        {"id": p["id"], "type": "paper", "label": p["title"]}
        for p in papers
    ]

    edges = []
    # group papers sharing a dataset or method -> creates the visible clusters
    by_dataset, by_method = defaultdict(list), defaultdict(list)
    for pid, a in analysis_by_paper.items():
        if a.get("dataset"):
            by_dataset[a["dataset"]].append(pid)
        if a.get("method"):
            by_method[a["method"]].append(pid)

    def link_group(groups: dict, relation: str):
        for _, ids in groups.items():
            for i in range(len(ids)):
                for j in range(i + 1, len(ids)):
                    edges.append({"source": ids[i], "target": ids[j], "relation": relation})

    link_group(by_dataset, "shares_dataset")
    link_group(by_method, "shares_method")

    # gap nodes are computed separately by the gap-finder service and stored;
    # simplified here as a placeholder query
    gaps = db.table("research_gaps").select("*").eq("project_id", project_id).execute().data
    for g in gaps:
        nodes.append({"id": g["id"], "type": "gap", "label": g["title"]})
        for pid in g.get("related_paper_ids", []):
            edges.append({"source": pid, "target": g["id"], "relation": "addresses_gap"})

    return {"nodes": nodes, "edges": edges}

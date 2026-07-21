"""
Builds node/edge data for the 3D corkboard graph, directly from the
structured paper analysis and persisted research_gaps -- both are free
byproducts of the extraction/gap-finder pipeline, not separately computed
here. This is what the frontend's Graph3D component (react-force-graph-3d)
renders as pinned cards with red string connections.

Returns:
  nodes: [{id, type: 'paper'|'gap', label}]
  edges: [{source, target, relation: 'shares_dataset'|'shares_method'|'addresses_gap'}]
"""
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models import User, Project, Paper, ResearchGap

router = APIRouter(prefix="/graph", tags=["graph"])


class GraphNode(BaseModel):
    id: str
    type: str  # "paper" | "gap"
    label: str


class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str  # "shares_dataset" | "shares_method" | "addresses_gap"


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


@router.get("/{project_id}", response_model=GraphResponse)
def get_graph(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    papers = (
        db.query(Paper)
        .filter(Paper.project_id == project.id, Paper.user_id == current_user.id)
        .all()
    )

    nodes = [GraphNode(id=p.id, type="paper", label=p.title) for p in papers]

    edges = []
    # group papers sharing a dataset or method -> creates the visible clusters
    by_dataset, by_method = defaultdict(list), defaultdict(list)
    for p in papers:
        if p.analysis is None:
            continue
        if p.analysis.dataset:
            by_dataset[p.analysis.dataset].append(p.id)
        if p.analysis.method:
            by_method[p.analysis.method].append(p.id)

    def link_group(groups: dict, relation: str):
        for _, ids in groups.items():
            for i in range(len(ids)):
                for j in range(i + 1, len(ids)):
                    edges.append(GraphEdge(source=ids[i], target=ids[j], relation=relation))

    link_group(by_dataset, "shares_dataset")
    link_group(by_method, "shares_method")

    gaps = db.query(ResearchGap).filter(ResearchGap.project_id == project.id).all()
    for g in gaps:
        nodes.append(GraphNode(id=g.id, type="gap", label=g.title))
        for paper_id in (g.related_paper_ids or []):
            edges.append(GraphEdge(source=paper_id, target=g.id, relation="addresses_gap"))

    return GraphResponse(nodes=nodes, edges=edges)
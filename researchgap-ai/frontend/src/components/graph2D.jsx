import { useState, useEffect, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { api } from "../lib/api";
import Spinner from "./Spinner";

const NODE_COLOR = {
  paper: "#3B4A5A", // steel
  gap: "#A6241D", // evidence-red -- the gap stands out from the papers
};

export default function Graph2D({ projectId }) {
  const [graphData, setGraphData] = useState(null); // {nodes, links} or null while loading
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const containerRef = useRef(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get(`/graph/${projectId}`);
        setGraphData({
          nodes: data.nodes,
          links: data.edges.map((e) => ({
            source: e.source,
            target: e.target,
            relation: e.relation,
          })),
        });
      } catch (err) {
        setError(err.message || "Couldn't load the graph.");
      }
    }
    load();
  }, [projectId]);

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.offsetWidth || 800);
    }
  }, [graphData]);

  if (error) {
    return (
      <p role="alert" className="font-mono text-xs text-evidence">
        {error}
      </p>
    );
  }

  if (graphData === null) {
    return <Spinner label="Loading graph..." />;
  }

  if (graphData.nodes.length === 0) {
    return (
      <p className="font-body text-sm text-fog">
        Nothing to graph yet. Upload papers and generate a gap report first.
      </p>
    );
  }

  return (
    <div>
      <div ref={containerRef} className="relative overflow-hidden border border-ink/15 bg-manila" style={{ height: 480 }}>
        <ForceGraph2D
          graphData={graphData}
          width={width}
          height={480}
          backgroundColor="#E8DFC8"
          nodeRelSize={5}
          nodeVal={(node) => (node.type === "gap" ? 8 : 5)}
          nodeColor={(node) => NODE_COLOR[node.type] || NODE_COLOR.paper}
          nodeLabel={(node) => node.label}
          linkColor={() => "#A6241D"}
          linkWidth={1.4}
          linkOpacity={0.6}
          linkDirectionalParticles={0}
          onNodeClick={(node) => setSelectedNode(node)}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const isGap = node.type === "gap";
            const radius = isGap ? 8 : 5;

            // node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = NODE_COLOR[node.type] || NODE_COLOR.paper;
            ctx.fill();
            ctx.lineWidth = 1.5 / globalScale;
            ctx.strokeStyle = "#1C1A17";
            ctx.stroke();

            // Label only drawn past a zoom threshold, to avoid an unreadable
            // cluster of overlapping text when the whole graph is zoomed out.
            if (globalScale > 1.2) {
              const fontSize = 12 / globalScale; // compensates the canvas transform so text renders at a constant visual size
              ctx.font = `${fontSize}px "IBM Plex Mono", monospace`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = "#1C1A17";
              const label = node.label.length > 28 ? `${node.label.slice(0, 28)}\u2026` : node.label;
              ctx.fillText(label, node.x, node.y + radius + 2);
            }
          }}
        />
      </div>

      {selectedNode && (
        <div className="mt-4 border border-cork/40 bg-cork/[0.06] p-4">
          <p className="font-mono text-[11px] tracking-wide text-fog">
            {selectedNode.type === "gap" ? "GAP" : "PAPER"}
          </p>
          <p className="mt-1 font-display text-lg">{selectedNode.label}</p>
        </div>
      )}
    </div>
  );
}
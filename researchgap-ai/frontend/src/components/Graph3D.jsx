import { useState, useEffect, useRef, useCallback } from "react";
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
import { api } from "../lib/api";

const CARD_FILL = {
  paper: "#EDE7D9", // aged index card
  gap: "#F7F1E4", // slightly brighter -- the gap card stands out
};
const PIN_FILL = {
  paper: "#3B4A5A", // steel pin
  gap: "#A6241D", // evidence-red pin -- marks the thing under investigation
};

/**
 * Draws a small index-card-with-pushpin as a canvas texture, used as a
 * THREE.Sprite per node. This is what makes each paper/gap look like a
 * physically pinned card rather than a generic sphere.
 */
function createCardSprite(label, type) {
  const canvas = document.createElement("canvas");
  const width = 256;
  const height = 160;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(6, 8, width - 8, height - 8); // drop shadow, offset

    ctx.fillStyle = CARD_FILL[type] || CARD_FILL.paper;
    ctx.fillRect(0, 0, width - 8, height - 8);
    ctx.strokeStyle = "rgba(28,26,23,0.25)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width - 8, height - 8);

    // pushpin
    ctx.beginPath();
    ctx.arc((width - 8) / 2, 16, 8, 0, Math.PI * 2);
    ctx.fillStyle = PIN_FILL[type] || PIN_FILL.paper;
    ctx.fill();

    // word-wrapped label
    ctx.fillStyle = "#1C1A17";
    ctx.font = "600 15px 'IBM Plex Mono', monospace";
    ctx.textAlign = "center";
    const maxWidth = width - 32;
    const words = (label || "").split(" ");
    const lines = [];
    let line = "";
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);

    const shown = lines.slice(0, 4);
    let y = 48;
    for (const l of shown) {
      ctx.fillText(l, (width - 8) / 2, y);
      y += 22;
    }
    if (lines.length > 4) ctx.fillText("\u2026", (width - 8) / 2, y);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(34, 21, 1);
  return sprite;
}

export default function Graph3D({ projectId }) {
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
        setError(err.message || "Couldn't load the board.");
      }
    }
    load();
  }, [projectId]);

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.offsetWidth || 800);
    }
  }, [graphData]);

  const nodeThreeObject = useCallback(
    (node) => createCardSprite(node.label, node.type),
    []
  );

  if (error) {
    return (
      <p role="alert" className="font-mono text-xs text-evidence">
        {error}
      </p>
    );
  }

  if (graphData === null) {
    return <p className="font-mono text-xs text-fog">LOADING BOARD...</p>;
  }

  if (graphData.nodes.length === 0) {
    return (
      <p className="font-body text-sm text-fog">
        Nothing pinned yet. Upload papers and generate a gap report to populate the board.
      </p>
    );
  }

  return (
    <div>
      <div
        ref={containerRef}
        className="relative overflow-hidden border border-cork-dark"
        style={{
          height: 500,
          backgroundColor: "#A87C4F",
          // Cork-speckle texture, pure CSS -- no image asset needed.
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(0,0,0,0.09) 0, rgba(0,0,0,0.09) 2px, transparent 2px), " +
            "radial-gradient(circle at 70% 65%, rgba(0,0,0,0.07) 0, rgba(0,0,0,0.07) 2px, transparent 2px), " +
            "radial-gradient(circle at 40% 85%, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 2px, transparent 2px)",
          backgroundSize: "42px 42px, 58px 58px, 36px 36px",
        }}
      >
        <ForceGraph3D
          graphData={graphData}
          width={width}
          height={500}
          backgroundColor="rgba(0,0,0,0)"
          nodeThreeObject={nodeThreeObject}
          nodeThreeObjectExtend={false}
          linkColor={() => "#A6241D"}
          linkWidth={1.2}
          linkOpacity={0.85}
          linkCurvature={0.15}
          onNodeClick={(node) => setSelectedNode(node)}
        />
      </div>

      {selectedNode && (
        <div className="mt-4 border border-cork/40 bg-cork/[0.06] p-4">
          <p className="font-mono text-[11px] tracking-wide text-fog">
            {selectedNode.type === "gap" ? "PINNED GAP" : "PINNED PAPER"}
          </p>
          <p className="mt-1 font-display text-lg">{selectedNode.label}</p>
        </div>
      )}
    </div>
  );
}
import Graph2D from "../../components/Graph2D";
import { useProjectContext } from "../ProjectWorkspace";

export default function GraphSection() {
  const { projectId } = useProjectContext();

  return (
    <div>
      <p className="mb-4 font-body text-sm text-fog">
        Papers and gaps, connected by shared method, dataset, or the gaps they address.
        Click a node for details.
      </p>
      <Graph2D projectId={projectId} />
    </div>
  );
}
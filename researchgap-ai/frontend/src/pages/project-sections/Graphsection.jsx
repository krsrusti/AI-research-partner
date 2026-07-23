import Graph3D from "../../components/Graph3D";
import { useProjectContext } from "../ProjectWorkspace";

export default function GraphSection() {
  const { projectId } = useProjectContext();

  return (
    <div>
      <p className="mb-4 font-body text-sm text-fog">
        Every paper and gap, pinned and connected.
      </p>
      <Graph3D projectId={projectId} />
    </div>
  );
}
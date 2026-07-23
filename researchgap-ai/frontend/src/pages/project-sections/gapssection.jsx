import GapReport from "../../components/GapReport";
import { useProjectContext } from "../ProjectWorkspace";

export default function GapsSection() {
  const { projectId, papers } = useProjectContext();

  if (papers === null) {
    return <p className="font-mono text-xs text-fog">LOADING...</p>;
  }

  return <GapReport projectId={projectId} paperCount={papers.length} />;
}
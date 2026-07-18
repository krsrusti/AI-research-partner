// TODO: fetch /graph/{project_id}, render with react-force-graph-3d
// (built on @react-three/fiber). Click paper node -> structured card;
// click gap node -> highlight connected papers + suggested questions.
import ForceGraph3D from "react-force-graph-3d";

export default function Graph3D({ data }) {
  return <ForceGraph3D graphData={data} nodeLabel="label" />;
}

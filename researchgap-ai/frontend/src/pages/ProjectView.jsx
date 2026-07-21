import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { isAuthenticated } from "../lib/auth";
import GapReport from "../components/GapReport";
import Graph3D from "../components/Graph3D";

export default function ProjectView() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [project, setProject] = useState(null);
  const [papers, setPapers] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [projectData, papersData] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/papers/${projectId}`),
      ]);
      setProject(projectData);
      setPapers(papersData);
    } catch (err) {
      setError(err.message || "Couldn't load this case.");
    }
  }, [projectId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    loadData();
  }, [navigate, loadData]);

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("project_id", projectId);
      formData.append("file", file);
      const result = await api.upload("/papers/upload", formData);
      setPapers((prev) => [result.paper, ...(prev || [])]);
    } catch (err) {
      setError(err.message || "Couldn't upload that file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeletePaper(paperId) {
    if (!window.confirm("Remove this paper from the case?")) return;
    try {
      await api.delete(`/papers/${paperId}`);
      setPapers((prev) => prev.filter((p) => p.id !== paperId));
    } catch (err) {
      setError(err.message || "Couldn't remove that paper.");
    }
  }

  return (
    <div className="min-h-screen bg-manila text-ink">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-mono text-sm font-medium tracking-[0.15em]">
            RESEARCHGAP&nbsp;AI
          </Link>
          <Link to="/dashboard" className="font-mono text-xs tracking-wide text-fog hover:text-ink">
            &larr; ALL CASES
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {project === null && !error && (
          <p className="font-mono text-xs text-fog">LOADING...</p>
        )}

        {project && (
          <>
            <p className="font-mono text-xs tracking-[0.2em] text-cork">CASE FILE</p>
            <h1 className="mt-2 font-display text-3xl">{project.name}</h1>
          </>
        )}

        {error && (
          <p role="alert" className="mt-4 font-mono text-xs text-evidence">
            {error}
          </p>
        )}

        {/* Papers / Evidence section */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs tracking-[0.2em] text-cork">EVIDENCE</p>
            <label className="cursor-pointer bg-evidence px-4 py-2 font-mono text-xs tracking-wide text-manila transition-colors hover:bg-evidence/90">
              {uploading ? "UPLOADING..." : "+ UPLOAD PAPER"}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelected}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>

          <div className="mt-4">
            {papers !== null && papers.length === 0 && (
              <p className="font-body text-sm text-fog">
                No papers uploaded yet. Add your first PDF above.
              </p>
            )}

            {papers !== null && papers.length > 0 && (
              <ul className="divide-y divide-ink/10 border border-ink/10">
                {papers.map((paper) => (
                  <li key={paper.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="font-display text-lg">{paper.title}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-fog">
                        {paper.filename} &middot; ADDED{" "}
                        {new Date(paper.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeletePaper(paper.id)}
                      className="font-mono text-xs text-fog hover:text-evidence"
                      aria-label={`Remove ${paper.title}`}
                    >
                      REMOVE
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {papers !== null && <GapReport projectId={projectId} paperCount={papers.length} />}

        {papers !== null && (
          <section className="mt-14 border-t border-ink/15 pt-8">
            <p className="font-mono text-xs tracking-[0.2em] text-cork">THE BOARD</p>
            <p className="mt-2 mb-4 font-body text-sm text-fog">
              Every paper and gap, pinned and connected.
            </p>
            <Graph3D projectId={projectId} />
          </section>
        )}

        {/* Placeholder sections for upcoming slices */}
        <section className="mt-8">
          <p className="font-mono text-xs tracking-[0.2em] text-fog">ASK THE PAPERS &mdash; coming soon</p>
        </section>
        <section className="mt-8">
          <p className="font-mono text-xs tracking-[0.2em] text-fog">NOTES &mdash; coming soon</p>
        </section>
      </main>
    </div>
  );
}
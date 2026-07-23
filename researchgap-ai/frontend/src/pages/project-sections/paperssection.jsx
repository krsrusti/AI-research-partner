import { useState, useRef } from "react";
import { api } from "../../lib/api";
import { useProjectContext } from "../ProjectWorkspace";

export default function PapersSection() {
  const { projectId, papers, refreshPapers } = useProjectContext();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("project_id", projectId);
      formData.append("file", file);
      await api.upload("/papers/upload", formData);
      await refreshPapers();
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
      await refreshPapers();
    } catch (err) {
      setError(err.message || "Couldn't remove that paper.");
    }
  }

  return (
    <section>
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

      {error && (
        <p role="alert" className="mt-4 font-mono text-xs text-evidence">
          {error}
        </p>
      )}

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
  );
}
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { isAuthenticated, logout } from "../lib/auth";
import Spinner from "../components/Spinner";

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.get("/projects");
      setProjects(data);
    } catch {
      setError("Couldn't load your cases. Try refreshing.");
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    loadProjects();
  }, [navigate, loadProjects]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const project = await api.post("/projects", { name: newName.trim() });
      setProjects((prev) => [project, ...(prev || [])]);
      setNewName("");
    } catch (err) {
      setError(err.message || "Couldn't create the case.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm("Delete this case? This can't be undone.")) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err.message || "Couldn't delete the case.");
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-manila text-ink">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-mono text-sm font-medium tracking-[0.15em]">
            RESEARCHGAP&nbsp;AI
          </Link>
          <button
            onClick={handleLogout}
            className="font-mono text-xs tracking-wide text-fog hover:text-ink"
          >
            LOG OUT
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <p className="font-mono text-xs tracking-[0.2em] text-cork">YOUR CASES</p>
        <h1 className="mt-2 font-display text-3xl">Open a case, or start a new one</h1>

        <form onSubmit={handleCreate} className="mt-8 flex gap-3">
          <input
            type="text"
            placeholder="e.g. Cryptocurrency Fraud Detection"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 border border-ink/25 bg-manila px-3 py-2.5 font-body text-ink outline-none focus:border-steel"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="bg-evidence px-5 py-2.5 font-mono text-sm tracking-wide text-manila transition-colors hover:bg-evidence/90 disabled:opacity-50"
          >
            {creating ? "OPENING..." : "+ NEW CASE"}
          </button>
        </form>

        {error && (
          <p role="alert" className="mt-4 font-mono text-xs text-evidence">
            {error}
          </p>
        )}

        <div className="mt-10">
          {projects === null && (
            <Spinner label="Loading your cases..." />
          )}

          {projects !== null && projects.length === 0 && (
            <p className="font-body text-sm text-fog">
              No cases yet. Open your first one above.
            </p>
          )}

          {projects !== null && projects.length > 0 && (
            <ul className="divide-y divide-ink/10 border border-ink/10">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    to={`/projects/${project.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-ink/[0.03] transition-colors"
                  >
                    <div>
                      <p className="font-display text-lg">{project.name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-fog">
                        OPENED {new Date(project.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDelete(project.id, e)}
                      className="font-mono text-xs text-fog hover:text-evidence"
                      aria-label={`Delete ${project.name}`}
                    >
                      DELETE
                    </button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
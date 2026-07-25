import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { isAuthenticated, logout } from "../lib/auth";
import Spinner from "../components/Spinner";

const RECENT_CASES_LIMIT = 5;

export default function Dashboard() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null); // null = loading
  const [error, setError] = useState(null);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.get("/projects");
      setProjects(data);
    } catch {
      setError("Couldn't load your cases.");
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    loadProjects();
  }, [navigate, loadProjects]);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const recentCases = projects ? projects.slice(0, RECENT_CASES_LIMIT) : [];

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
        <p className="font-mono text-xs tracking-[0.2em] text-cork">DASHBOARD</p>
        <h1 className="mt-2 font-display text-3xl">Welcome back.</h1>

        {error && (
          <p role="alert" className="mt-4 font-mono text-xs text-evidence">
            {error}
          </p>
        )}

        {/* Stats */}
        <div className="mt-10 grid grid-cols-2 gap-px border border-ink/10 sm:grid-cols-3">
          <div className="bg-manila p-6">
            <p className="font-mono text-[11px] tracking-wide text-fog">OPEN CASES</p>
            <p className="mt-2 font-display text-4xl">
              {projects === null ? <Spinner size="sm" /> : projects.length}
            </p>
          </div>
          <div className="border-l border-ink/10 bg-manila p-6 sm:border-l-0 sm:border-x">
            <p className="font-mono text-[11px] tracking-wide text-fog">MOST RECENT</p>
            <p className="mt-2 font-display text-lg leading-tight">
              {projects === null ? (
                <Spinner size="sm" />
              ) : projects.length > 0 ? (
                projects[0].name
              ) : (
                "No cases yet"
              )}
            </p>
          </div>
        </div>

        {/* Recent cases */}
        <div className="mt-10 flex items-center justify-between">
          <p className="font-mono text-xs tracking-[0.2em] text-cork">RECENT CASES</p>
          <Link to="/projects" className="font-mono text-xs text-steel hover:underline">
            VIEW ALL &rarr;
          </Link>
        </div>

        <div className="mt-4">
          {projects !== null && projects.length === 0 && (
            <div className="border border-ink/10 p-6 text-center">
              <p className="font-body text-sm text-fog">No cases yet.</p>
              <Link
                to="/projects"
                className="mt-3 inline-block bg-evidence px-4 py-2 font-mono text-xs tracking-wide text-manila hover:bg-evidence/90"
              >
                + OPEN YOUR FIRST CASE
              </Link>
            </div>
          )}

          {recentCases.length > 0 && (
            <ul className="divide-y divide-ink/10 border border-ink/10">
              {recentCases.map((project) => (
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
                    <span className="font-mono text-xs text-fog">OPEN &rarr;</span>
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
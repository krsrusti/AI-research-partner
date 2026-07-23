import { useState, useEffect, useCallback } from "react";
import { Link, NavLink, Outlet, useParams, useNavigate, useOutletContext } from "react-router-dom";
import { api } from "../lib/api";
import { isAuthenticated } from "../lib/auth";

const NAV_ITEMS = [
  { to: "papers", label: "PAPERS" },
  { to: "chat", label: "AI CHAT" },
  { to: "search", label: "SEARCH" },
  { to: "notes", label: "NOTES" },
  { to: "gaps", label: "RESEARCH GAP" },
  { to: "graph", label: "3D GRAPH" },
];

function navLinkClass({ isActive }) {
  return [
    "block px-4 py-2.5 font-mono text-xs tracking-wide transition-colors",
    isActive ? "bg-ink text-manila" : "text-fog hover:bg-ink/5 hover:text-ink",
  ].join(" ");
}

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [papers, setPapers] = useState(null); // null = loading
  const [error, setError] = useState(null);

  const refreshPapers = useCallback(async () => {
    try {
      const data = await api.get(`/papers/${projectId}`);
      setPapers(data);
    } catch (err) {
      setError(err.message || "Couldn't load papers.");
    }
  }, [projectId]);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    async function loadAll() {
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
    }
    loadAll();
  }, [navigate, projectId]);

  return (
    <div className="min-h-screen bg-manila text-ink">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link to="/" className="font-mono text-sm font-medium tracking-[0.15em]">
            RESEARCHGAP&nbsp;AI
          </Link>
          <Link to="/projects" className="font-mono text-xs tracking-wide text-fog hover:text-ink">
            &larr; ALL CASES
          </Link>
        </div>
      </header>

      {error && (
        <p role="alert" className="mx-auto max-w-6xl px-6 pt-4 font-mono text-xs text-evidence">
          {error}
        </p>
      )}

      {project === null && !error && (
        <p className="mx-auto max-w-6xl px-6 pt-8 font-mono text-xs text-fog">LOADING...</p>
      )}

      {project && (
        <div className="mx-auto flex max-w-6xl gap-8 px-6 py-10">
          <aside className="w-48 flex-shrink-0">
            <p className="mb-1 font-mono text-[10px] tracking-[0.2em] text-cork">CASE FILE</p>
            <h1 className="mb-6 font-display text-xl leading-tight">{project.name}</h1>
            <nav className="border border-ink/10">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 flex-1">
            <Outlet context={{ projectId, project, papers, refreshPapers }} />
          </main>
        </div>
      )}
    </div>
  );
}

export function useProjectContext() {
  return useOutletContext();
}
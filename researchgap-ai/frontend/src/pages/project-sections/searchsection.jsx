import { useState } from "react";
import { api } from "../../lib/api";
import { useProjectContext } from "../ProjectWorkspace";
import Spinner from "../../components/Spinner";

export default function SearchSection() {
  const { projectId } = useProjectContext();
  const [query, setQuery] = useState("");
  const [answerPoints, setAnswerPoints] = useState(null); // null = no search run yet
  const [sources, setSources] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setSearching(true);
    setError(null);
    try {
      const result = await api.post("/search", { project_id: projectId, query: q });
      setAnswerPoints(result.answer_points);
      setSources(result.sources);
    } catch (err) {
      setError(err.message || "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <section>
      <p className="font-mono text-xs tracking-[0.2em] text-cork">CROSS-PAPER SEARCH</p>
      <p className="mt-2 mb-6 font-body text-sm text-fog">
        Search by meaning, not just keyword &mdash; get a summarized answer plus the excerpts it came from.
      </p>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          placeholder="e.g. graph neural networks for fraud detection"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={searching}
          className="flex-1 border border-ink/25 bg-manila px-3 py-2.5 font-body text-ink outline-none focus:border-steel disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="flex items-center gap-2 bg-evidence px-5 py-2.5 font-mono text-sm tracking-wide text-manila transition-colors hover:bg-evidence/90 disabled:opacity-50"
        >
          {searching ? (
            <>
              <Spinner size="sm" />
              SEARCHING...
            </>
          ) : (
            "SEARCH"
          )}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-4 font-mono text-xs text-evidence">
          {error}
        </p>
      )}

      {answerPoints !== null && (
        <div className="mt-6">
          <p className="font-mono text-[11px] tracking-wide text-fog">SUMMARY</p>
          <ul className="mt-2 space-y-1.5">
            {answerPoints.map((point, i) => (
              <li key={i} className="flex gap-2 font-body text-sm leading-relaxed text-ink">
                <span className="text-evidence">&bull;</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sources.length > 0 && (
        <div className="mt-6">
          <p className="font-mono text-[11px] tracking-wide text-fog">SOURCE EXCERPTS</p>
          <ul className="mt-3 space-y-4">
            {sources.map((src, i) => (
              <li key={i} className="border border-ink/10 p-4">
                <p className="font-mono text-[11px] text-cork">{src.paper_title}</p>
                <p className="mt-2 font-body text-sm leading-relaxed text-ink">{src.text}</p>
                <p className="mt-2 font-mono text-[10px] tracking-wide text-fog">
                  RELEVANCE {(1 - src.distance).toFixed(2)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
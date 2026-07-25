import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import Spinner from "./Spinner";

const MIN_PAPERS_FOR_REPORT = 2;

export default function GapReport({ projectId, paperCount }) {
  const [report, setReport] = useState(null); // { common_trends, common_limitations, gaps } or null
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const loadExistingGaps = useCallback(async () => {
    try {
      const gaps = await api.get(`/gaps/${projectId}`);
      if (gaps.length > 0) {
        // GET only returns the persisted gaps list (not trends/limitations,
        // which aren't stored) -- still worth showing so a page refresh
        // doesn't lose the gaps entirely, just the trend/limitation summary.
        setReport({ common_trends: [], common_limitations: [], gaps });
      }
    } catch {
      // No existing report yet -- not an error state, just nothing to show.
    } finally {
      setLoadingExisting(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadExistingGaps();
  }, [loadExistingGaps]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const result = await api.post(`/gaps/generate/${projectId}`, {});
      setReport(result);
    } catch (err) {
      setError(err.message || "Couldn't generate the gap report.");
    } finally {
      setGenerating(false);
    }
  }

  const canGenerate = paperCount >= MIN_PAPERS_FOR_REPORT;

  return (
    <section className="mt-14 border-t border-ink/15 pt-8">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs tracking-[0.2em] text-cork">GAP REPORT</p>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || generating}
          className="flex items-center gap-2 bg-evidence px-4 py-2 font-mono text-xs tracking-wide text-manila transition-colors hover:bg-evidence/90 disabled:opacity-50"
        >
          {generating ? (
            <>
              <Spinner size="sm" />
              ANALYZING...
            </>
          ) : report ? (
            "REGENERATE"
          ) : (
            "GENERATE REPORT"
          )}
        </button>
      </div>

      {loadingExisting && (
        <div className="mt-4">
          <Spinner label="Checking for an existing report..." />
        </div>
      )}

      {!canGenerate && (
        <p className="mt-4 font-body text-sm text-fog">
          Upload at least {MIN_PAPERS_FOR_REPORT} papers to generate a gap report
          ({paperCount} so far).
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 font-mono text-xs text-evidence">
          {error}
        </p>
      )}

      {generating && (
        <p className="mt-4 font-mono text-xs text-fog">
          Reading every paper and comparing them against each other. This can take a moment...
        </p>
      )}

      {!loadingExisting && !generating && report && (
        <div className="mt-6 space-y-8">
          {report.common_trends.length > 0 && (
            <div>
              <p className="font-mono text-[11px] tracking-wide text-fog">COMMON TRENDS</p>
              <ul className="mt-2 space-y-1.5">
                {report.common_trends.map((trend, i) => (
                  <li key={i} className="font-body text-sm text-ink">
                    &bull; {trend}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.common_limitations.length > 0 && (
            <div>
              <p className="font-mono text-[11px] tracking-wide text-fog">COMMON LIMITATIONS</p>
              <ul className="mt-2 space-y-1.5">
                {report.common_limitations.map((lim, i) => (
                  <li key={i} className="font-body text-sm text-ink">
                    &bull; {lim}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="font-mono text-[11px] tracking-wide text-fog">
              POTENTIAL GAPS ({report.gaps.length})
            </p>
            <div className="mt-3 space-y-4">
              {report.gaps.map((gap) => (
                <div key={gap.id || gap.title} className="border border-cork/40 bg-cork/[0.06] p-5">
                  <h3 className="font-display text-lg">{gap.title}</h3>
                  {gap.description && (
                    <p className="mt-2 font-body text-sm text-ink/80">{gap.description}</p>
                  )}
                  <p className="mt-3 font-mono text-[11px] text-fog">
                    GROUNDED IN {gap.related_paper_ids.length} PAPER
                    {gap.related_paper_ids.length !== 1 ? "S" : ""}
                  </p>
                  {gap.suggested_questions?.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {gap.suggested_questions.map((q, i) => (
                        <li key={i} className="font-body text-sm italic text-steel">
                          &ldquo;{q}&rdquo;
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
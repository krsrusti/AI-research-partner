import { useState } from "react";
import { api } from "../../lib/api";
import { useProjectContext } from "../ProjectWorkspace";

export default function ChatSection() {
  const { projectId } = useProjectContext();
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState([]); // [{id, question, answer, sources}]
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;

    setAsking(true);
    setError(null);
    try {
      const result = await api.post("/chat", { project_id: projectId, question: q });
      setExchanges((prev) => [
        ...prev,
        { id: `${Date.now()}`, question: q, answer: result.answer, sources: result.sources },
      ]);
      setQuestion("");
    } catch (err) {
      setError(err.message || "Couldn't get an answer.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <section>
      <p className="font-mono text-xs tracking-[0.2em] text-cork">ASK THE PAPERS</p>
      <p className="mt-2 mb-6 font-body text-sm text-fog">
        Answers are grounded in your uploaded papers, with sources cited below each one.
      </p>

      {exchanges.length === 0 && (
        <p className="font-body text-sm text-fog">
          No questions asked yet. Try something like &ldquo;What dataset did they use?&rdquo;
        </p>
      )}

      <div className="space-y-6">
        {exchanges.map((ex) => (
          <div key={ex.id} className="border border-ink/10 p-5">
            <p className="font-mono text-[11px] tracking-wide text-steel">Q</p>
            <p className="mt-1 font-body text-sm font-medium text-ink">{ex.question}</p>

            <p className="mt-4 font-mono text-[11px] tracking-wide text-evidence">A</p>
            <p className="mt-1 font-body text-sm leading-relaxed text-ink">{ex.answer}</p>

            {ex.sources.length > 0 && (
              <div className="mt-4 border-t border-ink/10 pt-3">
                <p className="font-mono text-[10px] tracking-wide text-fog">SOURCES</p>
                <ul className="mt-2 space-y-2">
                  {ex.sources.map((src, i) => (
                    <li key={i}>
                      <p className="font-mono text-[11px] text-cork">{src.paper_title}</p>
                      <p className="mt-0.5 font-body text-xs italic text-fog">
                        &ldquo;{src.text_snippet}&rdquo;
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 font-mono text-xs text-evidence">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
        <input
          type="text"
          placeholder="Ask a question about these papers..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={asking}
          className="flex-1 border border-ink/25 bg-manila px-3 py-2.5 font-body text-ink outline-none focus:border-steel disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={asking || !question.trim()}
          className="bg-evidence px-5 py-2.5 font-mono text-sm tracking-wide text-manila transition-colors hover:bg-evidence/90 disabled:opacity-50"
        >
          {asking ? "ASKING..." : "ASK"}
        </button>
      </form>
    </section>
  );
}
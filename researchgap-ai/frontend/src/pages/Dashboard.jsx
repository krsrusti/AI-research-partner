import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

// Cycling status label -- structurally inspired by instrument-style rotating
// tags (workload/error/focus/intent-type displays), filled with our actual
// pipeline stages instead of generic buzzwords.
const PIPELINE_STAGES = ["EXTRACTING", "COMPARING", "SYNTHESIZING", "IDENTIFYING GAPS"];

function CyclingStage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % PIPELINE_STAGES.length), 1800);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-xs tracking-[0.2em] text-evidence">
      {PIPELINE_STAGES[index]}
    </span>
  );
}

const EXHIBITS = [
  {
    label: "EXHIBIT A",
    title: "Research Library",
    body: "Upload a stack of papers. Organize them into cases by topic.",
  },
  {
    label: "EXHIBIT B",
    title: "Chat With the Papers",
    body: "Ask what a method was, what dataset was used, what broke down. Answers are grounded in the actual text, with the source cited.",
  },
  {
    label: "EXHIBIT C",
    title: "Cross-Paper Search",
    body: "Search by meaning, not keyword. \"Fraud detection on Ethereum\" finds GraphSAGE, GCN, and GAT papers alike.",
  },
  {
    label: "EXHIBIT D",
    title: "The Gap Report",
    body: "Not what each paper says, but what the whole body of work is missing. Trends, shared limitations, and the specific questions no one's answered yet.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-manila text-ink">
      {/* Header */}
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="font-mono text-sm font-medium tracking-[0.15em]">
            RESEARCHGAP&nbsp;AI
          </span>
          <nav className="flex items-center gap-6 font-mono text-xs tracking-wide">
            <Link to="/login" className="text-fog hover:text-ink transition-colors">
              LOG IN
            </Link>
            <Link
              to="/register"
              className="border border-ink px-3 py-1.5 hover:bg-ink hover:text-manila transition-colors"
            >
              SIGN UP
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-20">
        <div className="mb-6">
          <CyclingStage />
        </div>
        <h1 className="font-display text-5xl leading-[1.08] tracking-tight sm:text-6xl">
          Find what the research
          <br />
          hasn&apos;t answered yet.
        </h1>
        <p className="mt-6 max-w-xl font-body text-lg leading-relaxed text-fog">
          Upload a stack of papers. We read every one of them, compare methods and
          datasets across the whole set, and show you the gap &mdash; grounded in
          citations, not guesses.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link
            to="/register"
            className="bg-evidence px-6 py-3 font-mono text-sm tracking-wide text-manila hover:bg-evidence/90 transition-colors"
          >
            START A CASE
          </Link>
          <span className="font-mono text-xs text-fog">No credit card. Free to start.</span>
        </div>
      </section>

      {/* Exhibits */}
      <section className="border-t border-ink/15 bg-ink text-manila">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <p className="mb-12 font-mono text-xs tracking-[0.2em] text-cork">
            THE CASE FILE
          </p>
          <div className="grid gap-px sm:grid-cols-2">
            {EXHIBITS.map((ex) => (
              <div key={ex.label} className="bg-ink p-8 sm:border sm:border-manila/10">
                <p className="mb-3 font-mono text-xs tracking-[0.2em] text-evidence">
                  {ex.label}
                </p>
                <h3 className="font-display text-2xl">{ex.title}</h3>
                <p className="mt-3 font-body text-sm leading-relaxed text-manila/70">
                  {ex.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <h2 className="font-display text-3xl">
          Ten papers deep and still no clear answer?
        </h2>
        <p className="mt-4 font-body text-fog">
          That&apos;s exactly the moment this is built for.
        </p>
        <Link
          to="/register"
          className="mt-8 inline-block border border-ink px-6 py-3 font-mono text-sm tracking-wide hover:bg-ink hover:text-manila transition-colors"
        >
          REGISTER
        </Link>
      </section>

      <footer className="border-t border-ink/15 py-8 text-center font-mono text-xs text-fog">
        RESEARCHGAP AI &mdash; a research gap finder
      </footer>
    </div>
  );
}
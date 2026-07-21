import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../lib/auth";
import { ApiError } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-manila px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="font-mono text-xs tracking-[0.15em] text-fog hover:text-ink">
          &larr; RESEARCHGAP AI
        </Link>

        <h1 className="mt-8 font-display text-3xl text-ink">Log in to your case file</h1>
        <p className="mt-2 font-body text-sm text-fog">
          Pick up where you left off.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="block font-mono text-xs tracking-wide text-fog">
              EMAIL
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full border border-ink/25 bg-manila px-3 py-2 font-body text-ink outline-none focus:border-steel"
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-mono text-xs tracking-wide text-fog">
              PASSWORD
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full border border-ink/25 bg-manila px-3 py-2 font-body text-ink outline-none focus:border-steel"
            />
          </div>

          {error && (
            <p role="alert" className="font-mono text-xs text-evidence">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-evidence px-4 py-3 font-mono text-sm tracking-wide text-manila transition-colors hover:bg-evidence/90 disabled:opacity-50"
          >
            {submitting ? "LOGGING IN..." : "LOG IN"}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-sm text-fog">
          No case file yet?{" "}
          <Link to="/register" className="text-steel hover:underline">
            Open one
          </Link>
        </p>
      </div>
    </div>
  );
}
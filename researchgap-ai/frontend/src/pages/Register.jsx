import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../lib/auth";
import { ApiError } from "../lib/api";

const MIN_PASSWORD_LENGTH = 8;

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password);
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

        <h1 className="mt-8 font-display text-3xl text-ink">Open a case file</h1>
        <p className="mt-2 font-body text-sm text-fog">
          Free to start. No credit card.
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full border border-ink/25 bg-manila px-3 py-2 font-body text-ink outline-none focus:border-steel"
            />
            <p className="mt-1.5 font-mono text-[11px] text-fog">
              At least {MIN_PASSWORD_LENGTH} characters.
            </p>
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
            {submitting ? "OPENING..." : "OPEN CASE FILE"}
          </button>
        </form>

        <p className="mt-6 text-center font-body text-sm text-fog">
          Already have a case?{" "}
          <Link to="/login" className="text-steel hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
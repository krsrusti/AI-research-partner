/**
 * Simple rotating spinner, styled to match the case-file aesthetic
 * (mono label + a spinning ring in the evidence-red accent). Used
 * anywhere a loading state needs a visible symbol, not just text.
 */
export default function Spinner({ label, size = "md" }) {
  const dimensions = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-5 w-5";

  return (
    <div className="flex items-center gap-2">
      <span
        role="status"
        aria-label={label || "Loading"}
        className={`${dimensions} inline-block animate-spin rounded-full border-2 border-cork/30 border-t-evidence`}
      />
      {label && <span className="font-mono text-xs text-fog">{label}</span>}
    </div>
  );
}
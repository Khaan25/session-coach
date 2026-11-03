// Shared pieces for the canvas previews: a terminal, and the note that says what an idea changes.
// Everything here is synthetic. Nothing on the canvas calls an API, Supabase or the model.

/** The fixed "now" every preview uses, so server and browser render the same relative dates. */
export const NOW = new Date("2026-11-03T09:00:00Z");

/** A terminal transcript. `$` lines are what the learner types; the rest is output. */
export function Terminal({ lines }: { lines: string[] }) {
  return (
    <div className="flex flex-col gap-1 well p-4 type-code-sm">
      {lines.map((line, i) => (
        <span key={i} className={line.startsWith("$") ? "text-text-1" : "text-text-2"}>
          {line || " "}
        </span>
      ))}
    </div>
  );
}

/** What this screen proposes, in one or two plain sentences, for the people reviewing the canvas. */
export function IdeaNote({ children }: { children: React.ReactNode }) {
  return <p className="border-s-2 border-accent-line ps-3 type-body-sm text-text-2">{children}</p>;
}

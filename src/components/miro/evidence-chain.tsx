const EVIDENCE_STEPS = [
  ["01", "Источник", "ссылка и дата"],
  ["02", "Факт", "что сказано точно"],
  ["03", "Предел", "чего данные не доказывают"],
] as const;

export function EvidenceChain() {
  return (
    <section
      aria-label="Контур доверия Миро"
      className="relative overflow-hidden rounded-[1.35rem] border border-[color:var(--border)] bg-black/15 p-4 sm:p-5"
    >
      <svg
        aria-hidden="true"
        className="absolute right-3 top-3 h-28 w-28 text-[color:var(--interactive-primary)] opacity-30"
        fill="none"
        viewBox="0 0 120 120"
      >
        <path d="M23 91 59 24l38 67-38-18-36 18Z" stroke="currentColor" strokeWidth="1" />
        <circle cx="59" cy="24" r="4" fill="currentColor" />
        <circle cx="23" cy="91" r="3" fill="currentColor" />
        <circle cx="97" cy="91" r="3" fill="currentColor" />
        <path d="M59 24v49M23 91h74" stroke="currentColor" strokeDasharray="3 5" />
      </svg>
      <p className="eyebrow relative mb-4 text-[11px]">Контур доверия</p>
      <ol className="relative space-y-3">
        {EVIDENCE_STEPS.map(([number, title, detail]) => (
          <li className="grid grid-cols-[2rem_1fr] gap-3" key={number}>
            <span className="font-[var(--font-mono)] text-[11px] text-[color:var(--interactive-primary)]">
              {number}
            </span>
            <span>
              <strong className="block text-sm font-medium text-[color:var(--foreground)]">
                {title}
              </strong>
              <span className="block text-xs leading-5 text-[color:var(--muted-foreground)]">
                {detail}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

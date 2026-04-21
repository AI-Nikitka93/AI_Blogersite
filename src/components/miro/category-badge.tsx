import { CATEGORY_LABELS, type MiroCategory } from "../../lib/posts";

const CATEGORY_STYLES: Record<MiroCategory, string> = {
  World:
    "border-[color:var(--border)] bg-white/4 text-[color:var(--foreground)]",
  Tech:
    "border-cyan-200/15 bg-cyan-300/10 text-cyan-100",
  Sports:
    "border-emerald-200/15 bg-emerald-300/10 text-emerald-100",
  Markets:
    "border-amber-200/20 bg-amber-300/10 text-amber-100",
};

export function CategoryBadge({
  category,
  active = false,
}: {
  category: MiroCategory;
  active?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-[0.12em] uppercase transition-colors",
        CATEGORY_STYLES[category],
        active ? "shadow-[0_0_0_1px_rgba(226,191,111,0.2)]" : "",
      ]
        .join(" ")
        .trim()}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}

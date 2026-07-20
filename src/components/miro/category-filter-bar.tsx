import Link from "next/link";
import { CATEGORY_LABELS, MIRO_CATEGORIES, type MiroCategory } from "../../lib/posts";

interface CategoryFilterBarProps {
  activeCategory?: MiroCategory;
}

export function CategoryFilterBar({ activeCategory }: CategoryFilterBarProps) {
  return (
    <nav className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-none">
      <Link
        href="/"
        className={`px-5 py-2.5 rounded-full whitespace-nowrap transition-all text-sm font-medium border ${
          !activeCategory
            ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
            : "bg-black/20 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
        }`}
      >
        Все записи
      </Link>
      {MIRO_CATEGORIES.map((cat) => (
        <Link
          key={cat}
          href={`/?category=${cat}`}
          className={`px-5 py-2.5 rounded-full whitespace-nowrap transition-all text-sm font-medium border ${
            activeCategory === cat
              ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]"
              : "bg-black/20 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
          }`}
        >
          {CATEGORY_LABELS[cat]}
        </Link>
      ))}
    </nav>
  );
}

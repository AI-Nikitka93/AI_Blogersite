import Link from "next/link";

interface QuietStateProps {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}

export function QuietState({ title, description, actionLabel, actionHref }: QuietStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 mt-8 text-center border border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm">
      <h3 className="text-2xl font-bold mb-3 text-[color:var(--foreground)]">{title}</h3>
      <p className="text-[color:var(--muted-foreground)] mb-8 max-w-md">{description}</p>
      <Link href={actionHref} className="button-shell button-primary px-6 py-2.5 rounded-full font-medium transition-all hover:scale-105">
        {actionLabel}
      </Link>
    </div>
  );
}

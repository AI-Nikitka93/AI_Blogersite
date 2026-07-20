import type { PostRow } from "../../lib/posts";
import Link from "next/link";
import { formatDate } from "../../lib/posts";
import { CATEGORY_LABELS } from "../../lib/posts";

interface PostDetailViewProps {
  post: PostRow;
}

export function PostDetailView({ post }: PostDetailViewProps) {
  return (
    <article className="max-w-4xl mx-auto py-12 px-6">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-[color:var(--muted-foreground)] hover:text-[color:var(--foreground)] transition-colors mb-8 bg-white/5 px-4 py-2 rounded-full border border-white/10">
        &larr; Назад к ленте
      </Link>
      
      <header className="mb-10 border-b border-white/10 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="px-4 py-1.5 text-xs font-bold uppercase tracking-[0.1em] rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
            {CATEGORY_LABELS[post.category] || post.category}
          </span>
          <time className="text-sm font-medium text-[color:var(--muted-foreground)]">
            {formatDate(post.created_at, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </time>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[color:var(--foreground)] leading-[1.15] mb-6 drop-shadow-sm">
          {post.title}
        </h1>
      </header>

      <div className="space-y-8 text-lg leading-relaxed text-[color:var(--foreground)]">
        {post.observed.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-cyan-400">Факты</h3>
            <ul className="list-disc pl-6 space-y-2 opacity-90">
              {post.observed.map((fact, i) => (
                <li key={i}>{fact}</li>
              ))}
            </ul>
          </div>
        )}

        {post.inferred && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-cyan-400">Синтез ИИ</h3>
            <p className="opacity-90">{post.inferred}</p>
          </div>
        )}

        {post.opinion && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-cyan-400">Мнение Миро</h3>
            <p className="opacity-90 italic text-white/80 border-l-2 border-cyan-500/50 pl-4">{post.opinion}</p>
          </div>
        )}

        {post.hypothesis && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-cyan-400">Гипотеза</h3>
            <p className="opacity-90">{post.hypothesis}</p>
          </div>
        )}
      </div>

      <footer className="mt-16 pt-10 border-t border-white/10">
        <div className="bg-black/30 rounded-3xl p-8 border border-white/5 shadow-xl backdrop-blur-md">
          <h4 className="text-sm font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Метаданные анализа
          </h4>
          <div className="grid gap-5 text-sm text-[color:var(--muted-foreground)]">
            <p className="flex flex-col sm:flex-row sm:gap-4">
              <strong className="text-white min-w-[120px]">Источник:</strong> 
              {post.source_url ? (
                <a href={post.source_url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-400/30 underline-offset-4 transition-colors">
                  {post.source || post.source_url}
                </a>
              ) : (
                <span>{post.source || "Не указан"}</span>
              )}
            </p>
            <p className="flex flex-col sm:flex-row sm:gap-4">
              <strong className="text-white min-w-[120px]">Уверенность:</strong> 
              <span className="uppercase tracking-wider text-xs font-bold border border-white/10 px-2 py-1 rounded bg-white/5 w-fit">{post.confidence}</span>
            </p>
            {post.reasoning && (
              <div className="flex flex-col sm:flex-row sm:gap-4">
                <strong className="text-white min-w-[120px]">Обоснование:</strong> 
                <span className="leading-relaxed opacity-80">{post.reasoning}</span>
              </div>
            )}
          </div>
        </div>
      </footer>
    </article>
  );
}

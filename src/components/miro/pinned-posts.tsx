import type { PostRow } from "../../lib/posts";
import { PostCard } from "./post-card";

interface PinnedPostsProps {
  posts: PostRow[];
}

export function PinnedPosts({ posts }: PinnedPostsProps) {
  if (!posts || posts.length === 0) return null;
  return (
    <div className="mt-12 mb-8">
      <h2 className="text-xl font-bold tracking-tight text-[color:var(--foreground)] mb-6 flex items-center gap-3">
        <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
        </svg>
        Архивные выборки
      </h2>
      <div className="grid gap-6 md:grid-cols-2">
        {posts.slice(0, 2).map((post, index) => (
          <PostCard key={post.id} post={post} index={index} />
        ))}
      </div>
    </div>
  );
}

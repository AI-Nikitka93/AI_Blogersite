import type { MiroCategory, PostRow } from "../../lib/posts";
import { PostCard } from "./post-card";

interface FeedContainerProps {
  activeCategory?: MiroCategory;
  featureFirst?: boolean;
  posts: PostRow[];
}

export function FeedContainer({ activeCategory, featureFirst, posts }: FeedContainerProps) {
  return (
    <div className="grid gap-6 mt-8">
      {activeCategory && (
        <h2 className="text-xl font-semibold tracking-tight text-white mb-2">
          Материалы по категории
        </h2>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, index) => (
          <PostCard key={post.id} post={post} index={index} />
        ))}
      </div>
    </div>
  );
}

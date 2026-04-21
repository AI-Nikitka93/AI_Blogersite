"use client";

import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "framer-motion";

import type { PostRow } from "../../lib/posts";
import type { MiroCategory } from "../../lib/posts";
import { PostCard } from "./post-card";

const FEED_EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function FeedContainer({
  posts,
  activeCategory,
}: {
  posts: PostRow[];
  activeCategory?: MiroCategory;
}) {
  const reduceMotion = useReducedMotion();
  const feedKey = activeCategory ?? "all";

  return (
    <LayoutGroup id="miro-feed">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6 lg:grid-cols-2 xl:gap-7"
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
          key={feedKey}
          layout
          transition={
            reduceMotion
              ? { duration: 0.01 }
              : {
                  duration: 0.34,
                  ease: FEED_EASE,
                  staggerChildren: 0.08,
                  delayChildren: 0.04,
                }
          }
        >
          {posts.map((post, index) => (
            <PostCard index={index} key={post.id} post={post} />
          ))}
        </motion.div>
      </AnimatePresence>
    </LayoutGroup>
  );
}

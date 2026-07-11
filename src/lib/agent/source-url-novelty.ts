type SourceUrlPost = {
  title: string;
  source_url?: string | null;
};

function isTrackingParameter(name: string): boolean {
  return name.startsWith("utm_") || name === "fbclid" || name === "gclid";
}

/**
 * Builds a stable story key for direct-source duplicates. Query parameters used
 * for analytics must not turn one article into multiple publishable stories.
 */
export function normalizeSourceUrlForNovelty(
  value: string | null | undefined,
): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (isTrackingParameter(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    return url.toString().replace(/\/$/u, "");
  } catch {
    return value.trim().replace(/\/$/u, "");
  }
}

export function findSourceUrlConflict(
  candidateSourceUrl: string | null | undefined,
  recentPosts: readonly SourceUrlPost[],
): string | null {
  const candidateKey = normalizeSourceUrlForNovelty(candidateSourceUrl);
  if (!candidateKey) {
    return null;
  }

  const duplicate = recentPosts.find(
    (post) => normalizeSourceUrlForNovelty(post.source_url) === candidateKey,
  );

  return duplicate?.title ?? null;
}

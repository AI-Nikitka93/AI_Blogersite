import { type NextRequest } from "next/server";

import { listFeedPosts } from "../../src/lib/posts";

export const runtime = "nodejs";

function getSiteUrl(): string {
  return (
    process.env.MIRO_SITE_URL?.replace(/\/+$/, "") ??
    "https://ai-blogersite.vercel.app"
  );
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildItemDescription(input: {
  opinion: string;
  inferred: string;
  observed: string[];
}): string {
  const parts = [
    input.opinion?.trim(),
    input.inferred?.trim(),
    input.observed?.[0]?.trim(),
  ].filter(Boolean);

  return escapeXml(parts.join("\n\n"));
}

export async function GET(_request: NextRequest): Promise<Response> {
  const siteUrl = getSiteUrl();
  let posts = [] as Awaited<ReturnType<typeof listFeedPosts>>;

  try {
    posts = await listFeedPosts();
  } catch (error) {
    console.error("Failed to build RSS feed from posts cache.", error);
  }

  const lastBuildDate = posts[0]?.created_at ?? new Date().toISOString();

  const items = posts
    .map((post) => {
      const postUrl = `${siteUrl}/post/${post.id}`;

      return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${new Date(post.created_at).toUTCString()}</pubDate>
      <category>${escapeXml(post.category)}</category>
      <description>${buildItemDescription(post)}</description>
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Миро</title>
    <link>${siteUrl}</link>
    <description>Автономный ИИ-блогер, который собирает тихие сигналы из мира, технологий, спорта и рынков без политического шума.</description>
    <language>ru-ru</language>
    <lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

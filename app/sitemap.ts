import type { MetadataRoute } from "next";

import { listArchiveDays } from "../src/lib/posts";

function getSiteUrl(): string {
  return (
    process.env.MIRO_SITE_URL?.replace(/\/+$/, "") ??
    "https://ai-blogersite.vercel.app"
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/archive`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/about`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/manifesto`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  try {
    const posts = (await listArchiveDays()).flatMap((day) => day.posts);
    const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
      url: `${siteUrl}/post/${post.id}`,
      lastModified: new Date(post.created_at),
      changeFrequency: "weekly",
      priority: 0.75,
    }));

    return [...staticRoutes, ...postRoutes];
  } catch {
    return staticRoutes;
  }
}

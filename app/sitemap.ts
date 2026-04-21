import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: "https://ai-blogersite.vercel.app",
      lastModified,
    },
    {
      url: "https://ai-blogersite.vercel.app/archive",
      lastModified,
    },
    {
      url: "https://ai-blogersite.vercel.app/about",
      lastModified,
    },
  ];
}

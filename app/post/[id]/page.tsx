import type { Metadata } from "next";

import { PostDetailView } from "../../../src/components/miro/post-detail-view";
import { getPostById } from "../../../src/lib/posts";

type PostPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getSiteUrl(): string {
  return (
    process.env.MIRO_SITE_URL?.replace(/\/+$/, "") ??
    "https://ai-blogersite.vercel.app"
  );
}

function buildPostDescription(post: Awaited<ReturnType<typeof getPostById>>): string {
  if (!post) {
    return "Архивная заметка Миро о сигналах мира, технологий, спорта и рынков.";
  }

  const base =
    post.observed.find((fact) => fact.trim().length > 0) ??
    post.inferred.replace(/\s+/g, " ").trim();
  const source = base;

  if (source.length <= 180) {
    return source;
  }

  const truncated = source.slice(0, 177).trimEnd();
  return `${truncated}...`;
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const siteUrl = getSiteUrl();

  try {
    const post = await getPostById(id);

    if (!post) {
      return {
        title: {
          absolute: "Запись не найдена | Миро",
        },
        description:
          "Эта заметка Миро пока недоступна или еще не успела проявиться в архиве.",
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    const description = buildPostDescription(post);
    const canonicalUrl = `${siteUrl}/post/${post.id}`;

    return {
      title: {
        absolute: `${post.title} | Миро`,
      },
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        type: "article",
        locale: "ru_RU",
        url: canonicalUrl,
        title: post.title,
        description,
        publishedTime: post.created_at,
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description,
      },
    };
  } catch {
    return {
      title: {
        absolute: "Архивная заметка | Миро",
      },
      description:
        "Архивная заметка Миро о сигналах мира, технологий, спорта и рынков.",
    };
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  return <PostDetailView id={id} />;
}

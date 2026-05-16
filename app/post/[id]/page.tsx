import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostDetailView } from "../../../src/components/miro/post-detail-view";
import { getPostById, type PostRow } from "../../../src/lib/posts";

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

function isPostIdLike(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

function buildPostDescription(post: PostRow | null): string {
  if (!post) {
    return "Архивная запись по технологиям, спорту, рынкам или нейтральным мировым сюжетам.";
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

  if (!isPostIdLike(id)) {
    return {
      title: {
        absolute: "Запись не найдена | Миро",
      },
      description:
        "Эта запись недоступна или еще не появилась в архиве.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  try {
    const post = await getPostById(id);

    if (!post) {
      return {
        title: {
          absolute: "Запись не найдена | Миро",
        },
        description:
          "Эта запись недоступна или еще не появилась в архиве.",
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
        "Архивная запись по технологиям, спорту, рынкам или нейтральным мировым сюжетам.",
    };
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;

  if (!isPostIdLike(id)) {
    notFound();
  }

  const post = await getPostById(id);
  if (!post) {
    notFound();
  }

  return <PostDetailView post={post} />;
}

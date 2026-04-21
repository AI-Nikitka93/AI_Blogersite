import { PostDetailView } from "../../../src/components/miro/post-detail-view";

type PostPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  return <PostDetailView id={id} />;
}

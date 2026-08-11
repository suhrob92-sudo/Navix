import { PostDetailContent } from '@/app/(cabinet)/feed/[id]/post-detail-content';

export const metadata = {
  title: 'Post',
  description: 'Post va unga yozilgan izohlar.',
};

interface PostPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;

  return <PostDetailContent postId={id} />;
}

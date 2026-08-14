import { TagContent } from '@/app/(cabinet)/feed/tag/[tag]/tag-content';

interface PageProps {
  params: Promise<{ tag: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { tag } = await params;
  const clean = decodeURIComponent(tag);

  return {
    title: `#${clean}`,
    description: `"${clean}" mavzusidagi postlar.`,
  };
}

export default async function HashtagPage({ params }: PageProps) {
  const { tag } = await params;

  return <TagContent tag={decodeURIComponent(tag).toLowerCase()} />;
}

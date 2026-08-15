import { VideosContent } from '@/app/(cabinet)/feed/videos/videos-content';

export const metadata = {
  title: 'Videolar',
  description: "Qisqa videolar — ko'ring va mahsulotni bir bosishda toping.",
};

interface PageProps {
  searchParams: Promise<{ start?: string }>;
}

export default async function FeedVideosPage({ searchParams }: PageProps) {
  const { start } = await searchParams;

  return <VideosContent startId={start ?? null} />;
}

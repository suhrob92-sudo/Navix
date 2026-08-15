import { WatchContent } from '@/app/(cabinet)/feed/watch/watch-content';

export const metadata = {
  title: 'Tomosha',
  description: "Qisqa videolar — ko'ring va mahsulotni bir bosishda toping.",
};

interface PageProps {
  searchParams: Promise<{ start?: string }>;
}

export default async function FeedWatchPage({ searchParams }: PageProps) {
  const { start } = await searchParams;

  return <WatchContent startId={start ?? null} />;
}

import { VideosContent } from '@/app/(cabinet)/feed/videos/videos-content';

export const metadata = {
  title: 'Videolar',
  description: "Qisqa videolar — ko'ring va mahsulotni bir bosishda toping.",
};

export default function FeedVideosPage() {
  return <VideosContent />;
}

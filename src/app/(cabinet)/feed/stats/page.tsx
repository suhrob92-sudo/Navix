import { VideoStatsContent } from '@/app/(cabinet)/feed/stats/stats-content';

export const metadata = {
  title: 'Videolarim natijasi',
  description: "Videolaringiz necha marta ko'rilgan, nechta mahsulot ochilgan va qancha savdo keltirgan.",
};

export default function VideoStatsPage() {
  return <VideoStatsContent />;
}

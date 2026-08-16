import { FeedHistoryContent } from '@/app/(cabinet)/feed/history/history-content';

export const metadata = {
  title: "Oxirgi ko'rganlar",
  description: "So'nggi ko'rgan postlaringiz.",
};

export default function FeedHistoryPage() {
  return <FeedHistoryContent />;
}

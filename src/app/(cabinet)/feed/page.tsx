import { FeedContent } from '@/app/(cabinet)/feed/feed-content';

export const metadata = {
  title: 'Lenta',
  description: 'Siz kuzatadigan odamlarning postlari va platformadagi yangiliklar.',
};

export default function FeedPage() {
  return <FeedContent />;
}

import { SavedContent } from '@/app/(cabinet)/feed/saved/saved-content';

export const metadata = {
  title: 'Saqlanganlar',
  description: "Keyin ko'rish uchun saqlab qo'ygan postlaringiz.",
};

export default function SavedPostsPage() {
  return <SavedContent />;
}

import { BlockedContent } from '@/app/(cabinet)/profile/blocked/blocked-content';

export const metadata = {
  title: 'Bloklanganlar',
  description: "Siz bloklagan foydalanuvchilar ro'yxati.",
};

export default function BlockedPage() {
  return <BlockedContent />;
}

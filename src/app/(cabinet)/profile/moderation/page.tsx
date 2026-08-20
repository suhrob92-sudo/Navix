import { ModerationContent } from '@/app/(cabinet)/profile/moderation/moderation-content';

export const metadata = {
  title: 'Qoidalar va qarorlar',
  description: 'Olib tashlangan yozuvlaringiz, sabablari va e\'tiroz yo\'li.',
};

export default function ModerationPage() {
  return <ModerationContent />;
}

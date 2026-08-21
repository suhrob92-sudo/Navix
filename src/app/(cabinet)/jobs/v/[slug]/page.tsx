import { VacancyContent } from '@/app/(cabinet)/jobs/v/[slug]/vacancy-content';

export const metadata = {
  title: 'Vakansiya',
  description: "Ish o'rni haqida batafsil.",
};

export default async function VacancyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <VacancyContent slug={slug} />;
}

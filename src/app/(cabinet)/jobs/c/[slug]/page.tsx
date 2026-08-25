import { CompanyContent } from '@/app/(cabinet)/jobs/c/[slug]/company-content';

export const metadata = {
  title: 'Kompaniya',
  description: "Kompaniya haqida ma'lumot va uning ochiq vakansiyalari.",
};

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <CompanyContent slug={slug} />;
}

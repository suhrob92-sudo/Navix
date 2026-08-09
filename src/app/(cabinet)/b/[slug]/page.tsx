import { BusinessProfileContent } from '@/app/(cabinet)/b/[slug]/business-profile-content';

export const metadata = {
  title: 'Biznes profili',
  description: "Restoran va do'kon profili.",
};

interface BusinessPageProps {
  params: Promise<{ slug: string }>;
}

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { slug } = await params;

  return <BusinessProfileContent slug={slug} />;
}

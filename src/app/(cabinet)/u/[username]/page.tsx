import { PublicProfileContent } from '@/app/(cabinet)/u/[username]/public-profile-content';

export const metadata = {
  title: 'Profil',
  description: 'Foydalanuvchi profili.',
};

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  return <PublicProfileContent username={username} />;
}

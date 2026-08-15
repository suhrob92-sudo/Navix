import { UserStoriesContent } from '@/app/(cabinet)/stories/[username]/user-stories-content';

interface PageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { username } = await params;

  return {
    title: `@${username} hikoyalari`,
    description: "24 soat ichida yo'qoladigan hikoyalar.",
  };
}

export default async function UserStoriesPage({ params }: PageProps) {
  const { username } = await params;

  return <UserStoriesContent username={username.toLowerCase()} />;
}

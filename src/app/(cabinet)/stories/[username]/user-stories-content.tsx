'use client';

import { Clapperboard } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { StoryViewer } from '@/components/story/story-viewer';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { RequireAuth } from '@/modules/auth/require-auth';
import type { StoryGroupView } from '@/modules/story/story.types';

export interface UserStoriesContentProps {
  username: string;
}

/**
 * Bitta odamning hikoyalari — havola orqali ochiladi.
 *
 * ── Nima uchun ALOHIDA sahifa kerak ──────────────────────────────────
 * Halqa faqat lentada bor va u faqat obuna bo'lganlarni ko'rsatadi.
 * Profildan yoki ulashilgan havoladan hikoyani ochish uchun esa o'z
 * manzili bo'lishi kerak.
 */
export function UserStoriesContent({ username }: UserStoriesContentProps) {
  return (
    <RequireAuth>
      <UserStoriesBody username={username} />
    </RequireAuth>
  );
}

function UserStoriesBody({ username }: UserStoriesContentProps) {
  const router = useRouter();

  const { data, isLoading, error } = useApiQuery<{ group: StoryGroupView }>(
    `/api/v1/stories/user/${encodeURIComponent(username)}`,
  );

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[60] bg-black p-4">
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 pt-6">
        {/*
          Xato matni serverdan keladi: hikoya yo'q, muddati o'tgan
          yoki bloklangan bo'lishi mumkin. Ularni ajratib ko'rsatish
          begonaga ortiqcha ma'lumot berardi.
        */}
        <Alert variant="error" title="Hikoya ochilmadi" className="mb-4">
          {error ?? "Bu odamda hozir hikoya yo'q."}
        </Alert>

        <EmptyState
          icon={Clapperboard}
          title="Hikoya topilmadi"
          description="Hikoyalar 24 soatdan keyin yo'qoladi. Ehtimol muddati tugagan."
          action={
            <Button variant="outline" onClick={() => router.push(`/u/${username}`)}>
              Profilga o&apos;tish
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <StoryViewer groups={[data.group]} startIndex={0} onClose={() => router.push(`/u/${username}`)} />
  );
}

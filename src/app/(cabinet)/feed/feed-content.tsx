'use client';

import { Bookmark, Clapperboard, Newspaper, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { PostComposer, type ComposerDraft } from '@/components/feed/post-composer';
import { PostList } from '@/components/feed/post-list';
import { TrendingHashtags } from '@/components/feed/trending-hashtags';
import { StoryTray } from '@/components/story/story-tray';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient } from '@/hooks/use-api';
import { useCursorList } from '@/hooks/use-cursor-list';
import { usePostActions } from '@/hooks/use-post-actions';
import { toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { FEED_TABS, type FeedTabName, type PostView } from '@/modules/feed/feed.types';

/**
 * Lenta.
 *
 * ── Nima uchun IKKI bo'lim ────────────────────────────────────────────
 * "Obunalarim" — odam o'zi tanlagan ovozlar. "Yangi" esa yangi
 * kelganlar uchun: obunasi yo'q odam bo'sh ekran ko'rmasligi va kimga
 * obuna bo'lishni topa olishi kerak.
 */
export function FeedContent() {
  const request = useApiClient();

  const [tab, setTab] = useState<FeedTabName>('FOLLOWING');
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const list = useCursorList<PostView>(`/api/v1/feed?tab=${tab}`, 'posts');
  const actions = usePostActions(list.setItems);

  async function publish(draft: ComposerDraft): Promise<boolean> {
    setIsSending(true);
    setSendError(null);

    try {
      const result = await request<{ post: PostView }>('/api/v1/posts', {
        method: 'POST',
        /**
         * Bo'sh maydonlar YUBORILMAYDI.
         *
         * Sxema `undefined` ni ixtiyoriy deb qabul qiladi, `null` ni
         * esa yo'q — shuning uchun ular umuman qo'shilmaydi.
         */
        body: {
          body: draft.body,
          ...(draft.imageUrl ? { imageUrl: draft.imageUrl } : {}),
          ...(draft.videoUrl ? { videoUrl: draft.videoUrl } : {}),
          ...(draft.videoPosterUrl ? { videoPosterUrl: draft.videoPosterUrl } : {}),
          ...(draft.videoSeconds ? { videoSeconds: draft.videoSeconds } : {}),
          ...(draft.productIds.length > 0 ? { productIds: draft.productIds } : {}),
        },
      });

      /**
       * Yangi post ro'yxat BOSHIGA qo'yiladi.
       *
       * Butun lentani qayta yuklash ham mumkin edi, lekin unda odam
       * o'qib turgan joyi yo'qolardi va mobil trafik bekorga sarflanardi.
       *
       * "Yangi" bo'limida ham to'g'ri ko'rinadi: post haqiqatan eng
       * yangisi.
       */
      list.setItems((current) => [result.post, ...current]);

      return true;
    } catch (caught) {
      setSendError(toUserMessage(caught));

      return false;
    } finally {
      setIsSending(false);
    }
  }

  const isEmpty = !list.isLoading && !list.error && list.items.length === 0;

  return (
    <>
      <AppHeader title="Lenta" />

      <div className="space-y-4 px-4 pt-4">
        {/*
          Hikoyalar halqasi ENG TEPADA.

          Hikoya — "bugun nima bo'lyapti" degan javob va u 24 soatdan
          keyin yo'qoladi. Pastroqqa qo'yilsa, odam uni umuman
          ko'rmasdan o'tib ketardi.
        */}
        <StoryTray />

        <PostComposer isSending={isSending} onSubmit={publish} />

        {sendError && <Alert variant="error">{sendError}</Alert>}

        <div className="flex gap-2">
          {/*
            "Videolar" — YORLIQ emas, HAVOLA.

            Video tomosha qilish boshqa holat: to'liq ekran, ovoz,
            vertikal surish. Uni shu ro'yxatning ichida ko'rsatib
            bo'lmaydi.
          */}
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/reels" aria-label="Videolar">
              <Clapperboard className="size-4" aria-hidden="true" />
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/feed/saved" aria-label="Saqlanganlar">
              <Bookmark className="size-4" aria-hidden="true" />
            </Link>
          </Button>

          {FEED_TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              aria-pressed={tab === item.value}
              className={cn(
                'flex-1 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                tab === item.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-secondary',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <TrendingHashtags />

        {actions.error && <Alert variant="error">{actions.error}</Alert>}

        {list.error && (
          <Alert variant="error" title="Lentani yuklab bo'lmadi">
            {list.error}
          </Alert>
        )}

        {list.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-40 rounded-2xl" />
            ))}
          </div>
        )}

        {isEmpty && tab === 'FOLLOWING' && (
          <EmptyState
            icon={Users}
            title="Lentangiz hozircha bo'sh"
            description="Odamlarga obuna bo'ling — ularning postlari shu yerda paydo bo'ladi."
            action={
              <Button asChild variant="outline">
                <Link href="/search">Odam qidirish</Link>
              </Button>
            }
          />
        )}

        {isEmpty && tab === 'LATEST' && (
          <EmptyState
            icon={Newspaper}
            title="Hali post yo'q"
            description="Birinchi bo'lib yozing — postingizni hamma ko'radi."
          />
        )}

        <PostList posts={list.items} actions={actions} />

        {list.hasMore && (
          <Button
            variant="outline"
            fullWidth
            isLoading={list.isLoadingMore}
            loadingText="Yuklanmoqda..."
            onClick={list.loadMore}
          >
            Yana ko&apos;rsatish
          </Button>
        )}
      </div>
    </>
  );
}

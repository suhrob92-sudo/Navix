'use client';

import { LayoutGrid, List, Menu, Newspaper, Plus } from 'lucide-react';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { CategoryRow } from '@/components/feed/category-row';
import { CreateMenu } from '@/components/feed/create-menu';
import { FeedMenu } from '@/components/feed/feed-menu';
import { PostComposer, type ComposerDraft } from '@/components/feed/post-composer';
import { PostList } from '@/components/feed/post-list';
import { TrendingHashtags } from '@/components/feed/trending-hashtags';
import { VideoGrid } from '@/components/feed/video-grid';
import { StoryComposer } from '@/components/story/story-composer';
import { StoryTray } from '@/components/story/story-tray';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { FEED_CATEGORIES, feedQueryFor, type FeedFilterValue } from '@/config/feed-nav';
import { useApiClient } from '@/hooks/use-api';
import { useCursorList } from '@/hooks/use-cursor-list';
import { usePostActions } from '@/hooks/use-post-actions';
import { toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { PostView } from '@/modules/feed/feed.types';

/**
 * Feed — bo'limning bosh ekrani.
 *
 * ── Nima uchun QAYTA QURILDI ──────────────────────────────────────────
 * ── HAQIQIY MUAMMO, foydalanuvchi aytgan ────────────────────────────
 * Feed bosqichma-bosqich o'sdi va oxirida ekranning yarmini xizmat
 * elementlari egallab qoldi: doim ochiq yozish maydoni, ikkita kichik
 * belgi (video va saqlanganlar), mavzular qatori, hikoyalar halqasi.
 * Kontentning o'zi esa pastda, ko'rinmas joyda qolardi.
 *
 * Endi tuzilish oddiy:
 *   1. Hikoyalar halqasi — tepada, u 24 soatlik va shoshilinch.
 *   2. Kategoriyalar qatori: usullar (Siz uchun / Obunalar / Yaqin
 *      atrofda) va bo'limlar (Restoranlar, Ishlar, ...).
 *   3. Kontent — ekranning QOLGAN HAMMASI.
 *   4. Yozish — pastdagi "+" tugmasi ostida.
 *   5. Qolgan bo'limlar — yuqoridagi menyu ostida, bir joyda.
 *
 * ── Nima uchun "Siz uchun" birinchi ───────────────────────────────────
 * Yangi kelgan odamda obuna yo'q va kategoriya ham tanlanmagan.
 * Unga birinchi ochilganda bo'sh ekran emas, HAMMA kontent
 * ko'rinishi kerak.
 */
export function FeedContent() {
  const request = useApiClient();

  const [filter, setFilter] = useState<FeedFilterValue>('FOR_YOU');

  /**
   * Panjara ko'rinishimi.
   *
   * ── Nima uchun TANLOV qoldirildi ────────────────────────────────────
   * Panjarada bir ekranda to'qqizta video ko'rinadi — tanlash oson.
   * Lekin kategoriyalarda matnli postlar ham bor va ular panjaraga
   * sig'maydi. Shuning uchun ikkalasi ham qoldirildi.
   */
  const [isGrid, setIsGrid] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  /** Qaysi qo'shimcha oyna ochiq: menyu, yaratish tanlovi, yozish, hikoya. */
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);

  /**
   * Video tanlash oynasi darhol ochilsinmi.
   *
   * "+" dan "Video" tanlanganda yozish maydoni ochiladi va u
   * fayl tanlagichni O'ZI ochadi — odam ikkinchi marta bosmaydi.
   */
  const [autoPick, setAutoPick] = useState<'VIDEO' | null>(null);

  const active = FEED_CATEGORIES.find((item) => item.value === filter) ?? FEED_CATEGORIES[0];
  const query = feedQueryFor(filter);

  /**
   * Panjarada FAQAT videolar ko'rsatiladi.
   *
   * Matnli postning muqovasi yo'q — panjarada u bo'sh katak bo'lib
   * turardi.
   */
  const path = active.isComingSoon
    ? null
    : `/api/v1/feed?tab=${isGrid ? 'VIDEO' : query.tab}` +
      (query.category ? `&category=${query.category}` : '');

  const list = useCursorList<PostView>(path, 'posts');
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
          ...(draft.category ? { category: draft.category } : {}),
          ...(draft.productIds.length > 0 ? { productIds: draft.productIds } : {}),
        },
      });

      /**
       * Yangi post ro'yxat BOSHIGA qo'yiladi.
       *
       * Butun lentani qayta yuklash ham mumkin edi, lekin unda odam
       * o'qib turgan joyi yo'qolardi va mobil trafik bekorga
       * sarflanardi.
       *
       * Faqat MOS yorliqqa qo'shiladi: videosiz post "Videolar"
       * yorlig'ida ko'rinib qolmasligi kerak.
       */
      if (belongsToActiveFilter(result.post)) {
        list.setItems((current) => [result.post, ...current]);
      }

      setIsComposerOpen(false);
      setAutoPick(null);

      return true;
    } catch (caught) {
      setSendError(toUserMessage(caught));

      return false;
    } finally {
      setIsSending(false);
    }
  }

  const isEmpty = !list.isLoading && !list.error && list.items.length === 0;

  /**
   * Yangi post MOS bo'limda ko'rinsa qo'shiladi.
   *
   * Aks holda "Restoranlar" bo'limida turgan odam ish e'lonini
   * joylasa, u shu yerda paydo bo'lib, filtr yolg'on ko'rinardi.
   */
  function belongsToActiveFilter(post: PostView): boolean {
    if (isGrid && !post.videoUrl) return false;
    if (query.category) return post.category === query.category;

    return true;
  }

  return (
    <>
      <AppHeader title="Feed" />

      <div className="space-y-4 px-4 pt-4 pb-24">
        <StoryTray />

        <CategoryRow value={filter} onChange={setFilter} />

        {/* Ko'rinish tanlovi va bo'limlar menyusi. */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground truncate text-xs">
            {`${active.emoji} ${active.label}`}
          </p>

          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label={isGrid ? "Ro'yxat ko'rinishi" : "Panjara ko'rinishi"}
              aria-pressed={isGrid}
              onClick={() => setIsGrid((current) => !current)}
            >
              {isGrid ? <List className="size-4" aria-hidden="true" /> : <LayoutGrid className="size-4" aria-hidden="true" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              aria-label="Feed bo'limlari"
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Mavzular FAQAT ro'yxat ko'rinishida — panjara ustida ortiqcha. */}
        {!isGrid && <TrendingHashtags />}

        {sendError && <Alert variant="error">{sendError}</Alert>}
        {actions.error && <Alert variant="error">{actions.error}</Alert>}

        {list.error && (
          <Alert variant="error" title="Lentani yuklab bo'lmadi">
            {list.error}
          </Alert>
        )}

        {list.isLoading && (
          <div className={cn(isGrid ? 'grid grid-cols-3 gap-1' : 'space-y-3')}>
            {Array.from({ length: isGrid ? 6 : 3 }, (_, index) => (
              <Skeleton
                key={index}
                className={cn(isGrid ? 'aspect-[9/16] rounded-lg' : 'h-40 rounded-2xl')}
              />
            ))}
          </div>
        )}

        {isEmpty && (
          <EmptyState
            icon={Newspaper}
            title={active.emptyTitle}
            description={active.emptyDescription}
            action={
              active.isComingSoon ? undefined : (
                <Button variant="outline" onClick={() => setIsCreateOpen(true)}>
                  Joylash
                </Button>
              )
            }
          />
        )}

        {isGrid ? <VideoGrid posts={list.items} /> : <PostList posts={list.items} actions={actions} />}

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

      {/*
        Yaratish tugmasi — SUZUVCHI.

        U doim ko'rinib turadi va lentani surganda ham yo'qolmaydi.
        Pastki menyudan yuqorida joylashgan: barmoq unga osongina
        yetadi va menyuni to'sib qo'ymaydi.
      */}
      <button
        type="button"
        aria-label="Joylash"
        onClick={() => setIsCreateOpen(true)}
        className="bg-primary text-primary-foreground fixed right-4 bottom-24 z-40 flex size-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
      >
        <Plus className="size-6" aria-hidden="true" />
      </button>

      {isMenuOpen && <FeedMenu onClose={() => setIsMenuOpen(false)} />}

      {isCreateOpen && (
        <CreateMenu
          onClose={() => setIsCreateOpen(false)}
          onPick={(choice) => {
            setIsCreateOpen(false);

            if (choice === 'STORY') {
              setIsStoryOpen(true);

              return;
            }

            setAutoPick(choice === 'VIDEO' ? 'VIDEO' : null);
            setIsComposerOpen(true);
          }}
        />
      )}

      {isComposerOpen && (
        <PostComposer
          isSending={isSending}
          autoPick={autoPick}
          onSubmit={publish}
          onClose={() => {
            setIsComposerOpen(false);
            setAutoPick(null);
          }}
        />
      )}

      {isStoryOpen && (
        <StoryComposer onClose={() => setIsStoryOpen(false)} onPosted={() => setIsStoryOpen(false)} />
      )}
    </>
  );
}

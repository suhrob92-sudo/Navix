'use client';

import { ArrowLeft, Clapperboard } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ReelPlayer } from '@/components/feed/reel-player';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient } from '@/hooks/use-api';
import { useCursorList } from '@/hooks/use-cursor-list';
import { usePostActions } from '@/hooks/use-post-actions';
import { useAuth } from '@/modules/auth/auth-context';
import { RequireAuth } from '@/modules/auth/require-auth';
import type { PostView } from '@/modules/feed/feed.types';

/**
 * Video lentasi — to'liq ekranli, vertikal suriladigan.
 *
 * ── Nima uchun ALOHIDA sahifa ─────────────────────────────────────────
 * Video oddiy lentaga ham tushadi, lekin u yerda kartochka ichida,
 * boshqa postlar orasida turadi. Video tomosha qilish esa boshqa
 * holat: odam telefonni ushlab, ketma-ket ko'radi va o'qimaydi.
 *
 * Bu ikki holatni bitta ekranda birlashtirib bo'lmaydi — shuning
 * uchun video uchun o'z sahifasi bor.
 *
 * ── Nima uchun `snap` (yopishqoq surish) ──────────────────────────────
 * Erkin surishda video yarim ko'rinib qoladi va qaysi birini
 * tinglashni bilib bo'lmaydi. `snap` esa har surishda aynan bitta
 * videoni ekranga qo'yadi — barmoq qayerda uzilishidan qat'i nazar.
 */
export function ReelsContent() {
  return (
    <RequireAuth>
      <ReelsBody />
    </RequireAuth>
  );
}

function ReelsBody() {
  const request = useApiClient();
  const { user } = useAuth();
  const list = useCursorList<PostView>('/api/v1/feed?tab=VIDEO&limit=10', 'posts');
  const actions = usePostActions(list.setItems);

  /**
   * Ko'rish serverga BIR MARTA yuboriladi.
   *
   * Odam videoni orqaga surib qayta ko'rsa, `ReelPlayer` ichidagi
   * belgi buni to'xtatadi. Lekin ro'yxat qayta chizilganda komponent
   * yangidan tug'ilishi mumkin — shuning uchun ikkinchi qulf shu
   * yerda, sahifa darajasida.
   */
  const viewedRef = useRef(new Set<string>());

  const markViewed = useCallback(
    (post: PostView) => {
      const postId = post.id;

      if (viewedRef.current.has(postId)) return;

      /**
       * O'Z videosi sanalmaydi.
       *
       * Server ham uni sanamaydi (sotuvchi o'zi ochib sonni
       * ko'tarib qo'ymasligi uchun). Shuning uchun ekranda ham
       * ko'tarilmasligi kerak: aks holda son sahifa yangilanganda
       * orqaga tushib, yolg'on ko'rsatgan bo'lardi.
       */
      if (post.author.userId === user?.id) return;

      viewedRef.current.add(postId);

      /**
       * Javob KUTILMAYDI va xato YUTILADI.
       *
       * Ko'rishlar soni — yordamchi ma'lumot. Uning yiqilishi
       * tomoshani to'xtatmasligi kerak.
       */
      void request(`/api/v1/posts/${postId}/view`, { method: 'POST', body: {} }).catch(() => {});

      // Ekranda ham darhol ko'rinadi — server javobi kutilmaydi.
      list.setItems((current) =>
        current.map((post) => (post.id === postId ? { ...post, viewCount: post.viewCount + 1 } : post)),
      );
    },
    [request, list, user?.id],
  );

  /** Hozir qaysi video ekranda. */
  const [activeId, setActiveId] = useState<string | null>(null);

  /**
   * Ovoz sozlamasi BARCHA videolar uchun umumiy.
   *
   * Har bir videoda qayta yoqish charchatardi. Boshida o'chiq:
   * brauzer ovozli avtomatik o'ynashga ruxsat bermaydi.
   */
  const [isMuted, setIsMuted] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Ekranda qaysi video turganini KUZATUVCHI aniqlaydi.
   *
   * Surish hodisasini tinglab, har safar o'lchamlarni hisoblash ham
   * mumkin edi — lekin u har piksel harakatida ishga tushardi va
   * telefonni qizdirardi. Kuzatuvchi esa faqat chegaradan o'tganda
   * xabar beradi.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.getAttribute('data-post-id'));
          }
        }
      },
      {
        root: container,
        // Yarmidan ko'pi ko'ringan video — "faol" video.
        threshold: 0.6,
      },
    );

    for (const child of container.querySelectorAll('[data-post-id]')) {
      observer.observe(child);
    }

    return () => observer.disconnect();
  }, [list.items]);

  /**
   * Oxiriga yaqinlashganda keyingi sahifa OLDINDAN yuklanadi.
   *
   * Odam oxirgi videoga yetganda yuklash boshlansa, u bo'sh ekranni
   * ko'rib turardi. Uchtadan oldin boshlansa — u umuman sezmaydi.
   */
  const handleScroll = useCallback(() => {
    if (!list.hasMore || list.isLoadingMore) return;

    const container = containerRef.current;
    if (!container) return;

    const remaining = container.scrollHeight - container.scrollTop - container.clientHeight;

    if (remaining < container.clientHeight * 3) {
      list.loadMore();
    }
  }, [list]);

  const isEmpty = !list.isLoading && !list.error && list.items.length === 0;

  return (
    /*
      Pastki menyudan YUQORIDA turadi (`z-50`).

      Menyu `z-40` da: teng bo'lsa u video ustiga chiqib, mahsulot
      tugmasini to'sib qo'yardi. To'liq ekranli tomosha esa boshqa
      holat — u paytda menyu kerak emas, orqaga tugmasi bor.
    */
    <div className="fixed inset-0 z-50 bg-black">
      {/* Orqaga tugmasi — to'liq ekranda pastki menyu ko'rinmaydi. */}
      <Link
        href="/feed"
        aria-label="Lentaga qaytish"
        className="absolute top-4 left-4 z-10 rounded-full bg-black/40 p-2.5 text-white backdrop-blur-sm transition-transform active:scale-95"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
      </Link>

      {list.isLoading && (
        <div className="flex h-full items-center justify-center p-6">
          <Skeleton className="h-full w-full rounded-2xl" />
        </div>
      )}

      {!list.isLoading && list.error && (
        <div className="flex h-full items-center justify-center p-6">
          <Alert variant="error" title="Videolarni yuklab bo'lmadi">
            {list.error}
          </Alert>
        </div>
      )}

      {isEmpty && (
        <div className="flex h-full items-center justify-center p-6">
          <EmptyState
            icon={Clapperboard}
            title="Hali video yo'q"
            description="Birinchi bo'lib video joylang — uni hamma ko'radi."
            action={
              <Button asChild variant="outline">
                <Link href="/feed">Lentaga o&apos;tish</Link>
              </Button>
            }
          />
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
      >
        {list.items.map((post) => (
          <div key={post.id} data-post-id={post.id} className="h-full w-full snap-start snap-always">
            <ReelPlayer
              post={post}
              isActive={activeId === post.id}
              isMuted={isMuted}
              onToggleMuted={() => setIsMuted((current) => !current)}
              onToggleLike={() => actions.toggleLike(post)}
              onToggleSave={() => actions.toggleSave(post)}
              onShared={() => void actions.sharePost(post)}
              onProductClick={(productId) => actions.trackProductClick(post.id, productId)}
              onViewed={() => markViewed(post)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

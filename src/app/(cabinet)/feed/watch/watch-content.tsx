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
import { useScreenAwake } from '@/hooks/use-screen-awake';
import { useWatchSettings } from '@/hooks/use-watch-settings';
import { useAuth } from '@/modules/auth/auth-context';
import { RequireAuth } from '@/modules/auth/require-auth';
import type { PostView } from '@/modules/feed/feed.types';

export interface WatchContentProps {
  /**
   * Qaysi videodan boshlanadi.
   *
   * Panjaradan bosilganda odam AYNAN o'sha videoni ochmoqchi
   * bo'ladi. Boshidan boshlansa, u nima uchun boshqa video
   * ochilganini tushunmasdi.
   */
  startId: string | null;
}

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
export function WatchContent({ startId }: WatchContentProps) {
  return (
    <RequireAuth>
      <WatchBody startId={startId} />
    </RequireAuth>
  );
}

function WatchBody({ startId }: WatchContentProps) {
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
   * Uzun video tugadi — KEYINGISIGA o'tamiz.
   *
   * ── Nima uchun avtomatik o'tish faqat uzun videoda ──────────────────
   * Qisqa reel takrorlanadi va bu to'g'ri: odam uni ataylab qayta
   * ko'radi. Uzun video esa tugagach o'z ishini bajarib bo'ldi —
   * uni qayta boshlash odamning vaqtini ham, trafigini ham
   * bekorga sarflardi.
   *
   * ── Nima uchun `scrollIntoView`, holat emas ─────────────────────────
   * Ekranda qaysi video "faol" ekanini kuzatuvchi (observer)
   * aniqlaydi. Holatni qo'lda o'zgartirsak, sahifa surilmasdan
   * turib boshqa video "faol" bo'lib qolardi: ovoz keyingi
   * videodan chiqib, ekranda esa eskisi turardi.
   *
   * Surish esa kuzatuvchini tabiiy ishga tushiradi.
   */
  const goToNext = useCallback((postId: string) => {
    const container = containerRef.current;
    if (!container) return;

    const current = container.querySelector(`[data-post-id="${postId}"]`);
    const next = current?.nextElementSibling;

    /*
      Oxirgi video — hech qayerga o'tilmaydi.

      Ro'yxat oxirida "yana yuklash" hali tugamagan bo'lishi
      mumkin. Bunday holatda video shunchaki to'xtab turadi va
      odam o'zi qaror qiladi.
    */
    if (!next) return;

    next.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  /**
   * Ovoz sozlamasi — barcha videolar uchun umumiy va ESLAB QOLINADI.
   *
   * Ilgari u sahifa bilan birga yashardi: odam ovozni yoqib
   * ko'rar, lentaga qaytib yana kirsa — ovoz yana o'chiq bo'lardi.
   * Kuniga o'n marta bosiladigan tugma ilovaning eng charchatadigan
   * joyi edi.
   */
  const { isMuted, toggleMuted } = useWatchSettings();

  /*
    Tomosha sahifasida ekran O'CHMAYDI.

    Bu sahifaning butun mazmuni — video ko'rish. Telefon esa 30
    soniya tegilmasa ekranni qoraytiradi va uzun videoda odam har
    yarim daqiqada ekranga tegishga majbur bo'lardi.
  */
  useScreenAwake(true);

  const containerRef = useRef<HTMLDivElement>(null);

  /** Boshlang'ich videoga BIR MARTA suriladi. */
  const jumpedRef = useRef(false);

  /**
   * Panjaradan tanlangan videoga suriladi.
   *
   * ── Nima uchun BIR MARTA ────────────────────────────────────────────
   * Ro'yxat "yana yuklash"da o'sadi. Har o'zgarishda surilsa, odam
   * pastga tushgan sari uni yuqoriga tortib turardi.
   */
  useEffect(() => {
    if (!startId || jumpedRef.current || list.items.length === 0) return;

    const target = containerRef.current?.querySelector(`[data-post-id="${startId}"]`);

    if (!target) return;

    jumpedRef.current = true;
    target.scrollIntoView({ block: 'start' });
  }, [startId, list.items.length]);

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
        href="/feed/videos"
        aria-label="Videolarga qaytish"
        className="tap-target absolute top-4 left-4 z-10 rounded-full bg-black/40 p-2.5 text-white backdrop-blur-sm transition-transform active:scale-95"
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
              onToggleMuted={toggleMuted}
              onEnded={() => goToNext(post.id)}
              onToggleLike={() => actions.toggleLike(post)}
              onToggleSave={() => actions.toggleSave(post)}
              onShared={() => void actions.sharePost(post)}
              onAttachmentClick={(attachmentId) => actions.trackAttachmentClick(post.id, attachmentId)}
              onViewed={() => markViewed(post)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

import { LayoutGrid, List, MapPin, Menu, Newspaper } from 'lucide-react';
import { useEffect, useState } from 'react';

import { FeedHeader } from '@/components/feed/feed-header';
import { CategoryRow } from '@/components/feed/category-row';
import { useFeedCreate } from '@/components/feed/feed-create-provider';
import { FeedMenu } from '@/components/feed/feed-menu';
import { PostList } from '@/components/feed/post-list';
import { TrendingHashtags } from '@/components/feed/trending-hashtags';
import { VideoGrid } from '@/components/feed/video-grid';
import { StoryTray } from '@/components/story/story-tray';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { FEED_CATEGORIES, feedQueryFor, type FeedFilterValue } from '@/config/feed-nav';
import { NEARBY_RADIUS_KM } from '@/config/geo';
import { useViewerLocation } from '@/hooks/use-viewer-location';
import { useCursorList } from '@/hooks/use-cursor-list';
import { usePostActions } from '@/hooks/use-post-actions';
import { cn } from '@/lib/utils';
import type { PostView } from '@/modules/feed/feed.types';

/**
 * Feed — modulning bosh sahifasi.
 *
 * ── Tuzilish ──────────────────────────────────────────────────────────
 *   1. Hikoyalar halqasi — tepada, u 24 soatlik va shoshilinch.
 *   2. Kategoriyalar qatori: usullar (Siz uchun / Obunalar / Yaqin
 *      atrofda) va bo'limlar (Restoranlar, Ishlar, ...).
 *   3. Kontent — ekranning QOLGAN HAMMASI.
 *   4. Yaratish va boshqa sahifalar — pastdagi Feed panelida.
 *
 * ── Nima uchun "Siz uchun" birinchi ───────────────────────────────────
 * Yangi kelgan odamda obuna yo'q va kategoriya ham tanlanmagan.
 * Unga birinchi ochilganda bo'sh ekran emas, HAMMA kontent
 * ko'rinishi kerak.
 */
export function FeedContent() {
  const create = useFeedCreate();

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /**
   * Ko'ruvchining joylashuvi — FAQAT "Yaqin atrofda" uchun.
   *
   * So'rov sahifa ochilishi bilan yuborilmaydi: sababi bilinmagan
   * ruxsat oynasini odam ko'pincha rad etadi va keyin uni qaytarish
   * qiyin.
   */
  const location = useViewerLocation();

  const active = FEED_CATEGORIES.find((item) => item.value === filter) ?? FEED_CATEGORIES[0];
  const query = feedQueryFor(filter);

  /**
   * Panjarada FAQAT videolar ko'rsatiladi.
   *
   * Matnli postning muqovasi yo'q — panjarada u bo'sh katak bo'lib
   * turardi.
   */
  const isNearby = filter === 'NEARBY';

  /**
   * "Yaqin atrofda" joylashuvsiz SO'RALMAYDI.
   *
   * Koordinatasiz so'rov oddiy lentani qaytarardi — ya'ni ekran
   * "yaqin atrofda" deb turib, butun mamlakat postlarini
   * ko'rsatardi. Bu yolg'on bo'lardi.
   */
  const path =
    active.isComingSoon || (isNearby && !location.point)
      ? null
      : `/api/v1/feed?tab=${isGrid ? 'VIDEO' : query.tab}` +
        (query.category ? `&category=${query.category}` : '') +
        (isNearby && location.point
          ? `&lat=${location.point.latitude}&lng=${location.point.longitude}`
          : '');

  const list = useCursorList<PostView>(path, 'posts');
  const actions = usePostActions(list.setItems);

  const { setItems } = list;

  /**
   * Yangi post ro'yxat BOSHIGA qo'yiladi.
   *
   * Yaratish oynasi endi Feed qolipida turadi — u BARCHA sahifalarda
   * ishlaydi. Lenta esa unga obuna bo'lib, natijani darhol ko'rsatadi:
   * butun ro'yxatni qayta yuklash shart emas, odamning o'qib turgan
   * joyi ham yo'qolmaydi.
   */
  useEffect(() => {
    return create.subscribe((post) => {
      // Faqat MOS bo'limga qo'shiladi: "Restoranlar" da turgan odam
      // ish e'lonini joylasa, u shu yerda paydo bo'lmasligi kerak —
      // aks holda filtr yolg'on ko'rinardi.
      if (isGrid && !post.videoUrl) return;
      if (query.category && post.category !== query.category) return;

      setItems((current) => [post, ...current]);
    });
    // `list` obyekti har chizishda yangi bo'ladi — bog'liqlikka faqat
    // barqaror `setItems` qo'yiladi, aks holda obuna cheksiz qayta
    // yaratilib turardi.
  }, [create, isGrid, query.category, setItems]);

  const isEmpty = !list.isLoading && !list.error && list.items.length === 0 && path !== null;

  /** "Yaqin atrofda" hali joylashuv kutyaptimi. */
  const needsLocation = isNearby && !location.point;

  return (
    <>
      <FeedHeader title="Feed" />

      <div className="space-y-4 px-4 pt-4 pb-24">
        <StoryTray />

        <CategoryRow value={filter} onChange={setFilter} />

        {/* Ko'rinish tanlovi va bo'limlar menyusi. */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground truncate text-xs">
            {`${active.emoji} ${active.label}`}
            {/* Oraliq ochiq aytiladi — "yaqin" so'zi mavhum. */}
            {isNearby && location.point && ` · ${NEARBY_RADIUS_KM} km`}
          </p>

          {/*
            Ko'rinish va menyu tugmalari — O'NG tomonda.

            Maketdagi kabi kvadratga yaqin, yumshoq burchakli: ular
            amal tugmalari va doiralardan (kategoriyalar) ko'rinishi
            bilan farq qilishi kerak.
          */}
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              aria-label={isGrid ? "Ro'yxat ko'rinishi" : "Panjara ko'rinishi"}
              aria-pressed={isGrid}
              onClick={() => setIsGrid((current) => !current)}
              className={cn(
                'border-border inline-flex size-11 items-center justify-center rounded-2xl border transition-colors active:scale-95',
                isGrid ? 'bg-secondary text-foreground' : 'hover:bg-secondary text-muted-foreground',
              )}
            >
              {isGrid ? <List className="size-5" aria-hidden="true" /> : <LayoutGrid className="size-5" aria-hidden="true" />}
            </button>

            <button
              type="button"
              aria-label="Feed menyusi"
              onClick={() => setIsMenuOpen(true)}
              className="border-border text-muted-foreground hover:bg-secondary inline-flex size-11 items-center justify-center rounded-2xl border transition-colors active:scale-95"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Mavzular FAQAT ro'yxat ko'rinishida — panjara ustida ortiqcha. */}
        {!isGrid && <TrendingHashtags />}

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

        {/*
          Joylashuv so'rovi — TUSHUNTIRISH bilan.

          Brauzerning o'z oynasi faqat "ruxsat berasizmi?" deb
          so'raydi va nima uchunligini aytmaydi. Odam sababni
          bilmasa, deyarli har doim rad etadi.
        */}
        {needsLocation && (
          <div className="border-border rounded-2xl border p-5 text-center">
            <span className="bg-secondary text-primary mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-full">
              <MapPin className="size-6" aria-hidden="true" />
            </span>

            <h2 className="text-base font-semibold">Yaqin atrofdagilarni ko&apos;rsatamiz</h2>

            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              {`Buning uchun joylashuvingiz kerak. U hech qayerga saqlanmaydi — faqat shu so'rov uchun ishlatiladi va ${NEARBY_RADIUS_KM} km oralig'idagi postlar topiladi.`}
            </p>

            {location.error && (
              <Alert variant="warning" className="mt-3 text-left">
                {location.status === 'DENIED'
                  ? "Joylashuvga ruxsat berilmadi. Brauzer sozlamalaridan ruxsat berib, qaytadan urinib ko'ring."
                  : location.error}
              </Alert>
            )}

            <Button
              className="mt-4"
              isLoading={location.status === 'ASKING'}
              loadingText="Aniqlanmoqda..."
              onClick={location.request}
            >
              <MapPin className="size-4" aria-hidden="true" />
              Joylashuvni aniqlash
            </Button>
          </div>
        )}

        {isEmpty && (
          <EmptyState
            icon={Newspaper}
            title={active.emptyTitle}
            description={active.emptyDescription}
            action={
              active.isComingSoon ? undefined : (
                /*
                  CTA tugmasi GRADIENT — maketdagi kabi.

                  Bo'sh ekranda bu yagona amal va u ko'zga tashlanishi
                  kerak. Oddiy chegarali tugma bo'sh joyda yo'qolib
                  ketardi.
                */
                <button
                  type="button"
                  onClick={create.open}
                  className="from-brand-from to-brand-to text-brand-foreground shadow-brand-from/25 inline-flex h-12 items-center justify-center rounded-2xl bg-gradient-to-r px-8 text-sm font-semibold shadow-lg transition-transform active:scale-95"
                >
                  Joylash
                </button>
              )
            }
          />
        )}

        {isGrid ? (
          <VideoGrid posts={list.items} />
        ) : (
          <PostList posts={list.items} actions={actions} viewerPoint={isNearby ? location.point : null} />
        )}

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

      {isMenuOpen && <FeedMenu onClose={() => setIsMenuOpen(false)} />}
    </>
  );
}

'use client';

import { Clock, Hash, Search, SearchX, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { FeedHeader } from '@/components/feed/feed-header';
import { CreatorRow } from '@/components/feed/creator-row';
import { PostList } from '@/components/feed/post-list';
import { VideoGrid } from '@/components/feed/video-grid';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePostActions } from '@/hooks/use-post-actions';
import { cn } from '@/lib/utils';
import { MIN_SEARCH_LENGTH } from '@/modules/feed/discover.types';
import { SEARCH_SCOPES, SEARCH_SCOPE_LABELS, type FeedSearchResult, type SearchScope } from '@/modules/feed/discover.types';

/**
 * Feed qidiruvi — modulning 4-sahifasi.
 *
 * ── Nima uchun bo'sh maydonda ham NIMADIR ko'rinadi ───────────────────
 * Qidiruv sahifasi ochilganda odam ko'pincha nima yozishni bilmaydi.
 * Bo'sh ekran uni orqaga qaytarib yuboradi.
 *
 * Shuning uchun yozilmagan holatda "kashf qilish" ko'rsatiladi:
 * mashhur mavzular, tavsiya etilgan ijodkorlar va mashhur videolar.
 * Odam qidirmasdan ham nimadir topadi.
 *
 * ── Nima uchun ilovaning umumiy qidiruvidan alohida ───────────────────
 * `/search` butun ilova bo'ylab qidiradi: mahsulot, taom, ish e'loni,
 * bo'limlar. Bu yerda esa faqat Feed: video, ijodkor, mavzu.
 *
 * Ikkalasini birlashtirsak, "burger" so'zi restoran taomini ham,
 * video ham chiqarardi va natija chalkash bo'lardi.
 */
export function FeedSearchContent() {
  const request = useApiClient();

  const [text, setText] = useState('');
  const [scope, setScope] = useState<SearchScope>('ALL');

  /**
   * Tarixga yozish BELGISI.
   *
   * ── Nima uchun holatda saqlanadi ────────────────────────────────────
   * So'rov har harfdan keyin yuboriladi. Agar har safar yozilsa,
   * tarix "b", "bu", "bur" bilan to'lardi.
   *
   * Odam klaviaturadagi "qidirish" tugmasini bosganda esa bu
   * belgi yoqiladi va KEYINGI so'rov tarixga tushadi.
   */
  const [shouldRemember, setShouldRemember] = useState(false);

  /**
   * So'rov 350 ms KECHIKTIRIB yuboriladi.
   *
   * Har bosilgan harf uchun so'rov yuborilsa, "restoran" so'zi
   * sakkizta so'rov hosil qilardi — mobil trafik ham, baza ham
   * bekorga yuklanardi.
   */
  const query = useDebouncedValue(text.trim(), 350);

  const isSearching = query.length >= MIN_SEARCH_LENGTH;

  const path = isSearching
    ? `/api/v1/feed/discover?q=${encodeURIComponent(query)}&scope=${scope}`
    : '/api/v1/feed/discover';

  const { data, isLoading, error } = useApiQuery<FeedSearchResult>(
    shouldRemember && isSearching ? `${path}&remember=1` : path,
  );

  const history = useApiQuery<{ queries: string[] }>('/api/v1/feed/search-history');

  const hashtags = data?.hashtags ?? [];
  const creators = data?.creators ?? [];
  const videos = data?.videos ?? [];
  const posts = data?.posts ?? [];

  /*
    Postlar uchun tugmalar (yoqtirish, saqlash) KERAK.

    Qidiruv natijasidagi post ham to'liq post: odam uni o'sha
    yerdan yoqtirishi yoki saqlashi mumkin. Tugmasiz kartochka
    "buzuq" ko'rinardi.
  */
  const actions = usePostActions(() => undefined);

  const recent = history.data?.queries ?? [];

  const isEmpty =
    !isLoading &&
    !error &&
    hashtags.length === 0 &&
    creators.length === 0 &&
    videos.length === 0 &&
    posts.length === 0;

  /** Tarixdagi so'zni bosish — darhol qidiradi. */
  function pickFromHistory(value: string) {
    setText(value);
    setShouldRemember(true);
  }

  async function forgetSearch(value?: string) {
    const suffix = value ? `?q=${encodeURIComponent(value)}` : '';

    try {
      await request(`/api/v1/feed/search-history${suffix}`, { method: 'DELETE' });
      history.reload();
    } catch {
      /*
        Tarix — QULAYLIK, ma'lumot emas.

        O'chirib bo'lmasa ham qidiruvning o'zi ishlashda davom
        etadi. Ekranda qizil xato ko'rsatish esa odamni bekorga
        qo'rqitardi.
      */
    }
  }

  return (
    <>
      <FeedHeader title="Qidirish" showSearch={false} />

      <div className="space-y-5 px-4 pt-4 pb-tabbar">
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2"
            aria-hidden="true"
          />

          <input
            type="search"
            value={text}
            onChange={(event) => {
              setText(event.target.value);

              // Yozish boshlandi — bu hali "tasdiqlangan" qidiruv emas.
              setShouldRemember(false);
            }}
            /*
              Klaviaturadagi "qidirish" tugmasi — TASDIQ.

              Aynan shu paytda odam qidiruvini tugatgan bo'ladi va
              so'zni tarixga yozish mumkin.
            */
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                setShouldRemember(true);
              }
            }}
            placeholder="Post, video, yaratuvchi yoki xeshteg"
            aria-label="Feed bo'ylab qidirish"
            enterKeyHint="search"
            className="bg-card border-border focus-visible:ring-ring h-11 w-full rounded-xl border pr-3 pl-10 text-sm outline-none focus-visible:ring-2"
          />
        </div>

        {/*
          Oxirgi qidiruvlar — FAQAT bo'sh maydonda.

          ── Nima uchun qidirilayotganda yashiriladi ────────────────
          Odam yozayotganda ekranda natija turishi kerak. Tarix
          o'sha paytda natijani pastga surib, "qayerda?" degan
          savol tug'dirardi.
        */}
        {!isSearching && recent.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold">
                <Clock className="text-muted-foreground size-4" aria-hidden="true" />
                Oxirgi qidiruvlar
              </h2>

              <Button variant="ghost" size="sm" onClick={() => void forgetSearch()}>
                Tozalash
              </Button>
            </div>

            <ul className="flex flex-wrap gap-2">
              {recent.map((item) => (
                <li key={item}>
                  {/*
                    Ikki tugma yonma-yon: so'zning O'ZI va o'chirish.

                    Bittasiga birlashtirsak, o'chirish tugmasi
                    qidiruvni ham ishga tushirardi — ya'ni odam
                    o'chirmoqchi bo'lgan so'z ekranda ochilardi.
                  */}
                  <span className="bg-card border-border inline-flex items-center rounded-full border">
                    <button
                      type="button"
                      onClick={() => pickFromHistory(item)}
                      className="hover:bg-secondary rounded-l-full py-1.5 pr-1.5 pl-3 text-sm transition-colors"
                    >
                      {item}
                    </button>

                    <button
                      type="button"
                      aria-label={`"${item}" ni tarixdan o'chirish`}
                      onClick={() => void forgetSearch(item)}
                      className="text-muted-foreground hover:text-foreground rounded-r-full py-1.5 pr-2.5 pl-1 transition-colors"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/*
          Turlar qatori FAQAT qidirilayotganda ko'rinadi.

          Bo'sh maydonda u nimani filtrlashi noma'lum edi va faqat
          chalkashtirardi.
        */}
        {isSearching && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SEARCH_SCOPES.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={scope === value}
                onClick={() => setScope(value)}
                className={cn(
                  'shrink-0 rounded-full border px-4 py-2 text-sm whitespace-nowrap transition-colors',
                  scope === value
                    ? 'border-primary bg-primary text-primary-foreground font-medium'
                    : 'border-border hover:bg-secondary',
                )}
              >
                {SEARCH_SCOPE_LABELS[value]}
              </button>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="error" title="Qidiruv ishlamadi">
            {error}
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-8 w-40 rounded-full" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        )}

        {isEmpty && (
          <EmptyState
            icon={SearchX}
            title={isSearching ? 'Hech narsa topilmadi' : "Hozircha bo'sh"}
            description={
              isSearching
                ? "Boshqacha yozib ko'ring yoki xeshteg bilan qidiring."
                : "Birinchi videolar joylangach, shu yerda mashhurlari chiqadi."
            }
          />
        )}

        {hashtags.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">
              {isSearching ? 'Tegishli xeshteglar' : 'Mashhur mavzular'}
            </h2>

            <div className="flex flex-wrap gap-2">
              {hashtags.map((item) => (
                <Link
                  key={item.tag}
                  href={`/feed/tag/${item.tag}`}
                  className="bg-card border-border hover:bg-secondary inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
                >
                  <Hash className="text-muted-foreground size-3.5" aria-hidden="true" />
                  <span>{item.tag}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">{item.postCount}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {creators.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">
              {isSearching ? 'Yaratuvchilar' : 'Siz uchun yaratuvchilar'}
            </h2>

            <ul className="space-y-2">
              {creators.map((creator) => (
                <li key={creator.id}>
                  <CreatorRow creator={creator} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {videos.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">
              {isSearching ? 'Videolar' : 'Mashhur videolar'}
            </h2>

            <VideoGrid posts={videos} />
          </section>
        )}

        {/*
          Postlar — ENG OXIRIDA.

          ── Nima uchun pastda ─────────────────────────────────────
          Yuqoridagilar QISQA: xeshteg — bitta so'z, ijodkor — bitta
          qator, video — kichik muqova. Ular bir ekranga sig'adi va
          odam nima topilganini bir qarashda ko'radi.

          Post esa BALAND: matn, rasm, tugmalar. Uni yuqoriga
          qo'ysak, uchta post qolgan hamma narsani ekrandan surib
          yuborardi.
        */}
        {posts.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Postlar</h2>

            <PostList posts={posts} actions={actions} canManage={false} />
          </section>
        )}
      </div>
    </>
  );
}

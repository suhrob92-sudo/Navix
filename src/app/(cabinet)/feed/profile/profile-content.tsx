'use client';

import { BadgeCheck, Newspaper, Settings } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { FeedHeader } from '@/components/feed/feed-header';
import { useFeedCreate } from '@/components/feed/feed-create-provider';
import { PostList } from '@/components/feed/post-list';
import { VideoGrid } from '@/components/feed/video-grid';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { useCursorList } from '@/hooks/use-cursor-list';
import { usePostActions } from '@/hooks/use-post-actions';
import { cn } from '@/lib/utils';
import { formatCompactCount, type PostView } from '@/modules/feed/feed.types';
import { formatUsername, type PublicProfileResponse } from '@/modules/profile/social.types';

/** Profil sahifasidagi yorliqlar. */
const TABS = [
  { value: 'POSTS', label: 'Postlar' },
  { value: 'SAVED', label: 'Saqlanganlar' },
  { value: 'LIKED', label: 'Yoqtirganlar' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

/**
 * Bo'sh holatdagi matn — har bir yorliq uchun alohida.
 *
 * Uchalasiga bitta matn yozsak ("hech narsa yo'q"), odam nima
 * qilishini bilmasdi. Har biri O'Z yo'lini ko'rsatadi.
 */
const EMPTY: Record<TabValue, { title: string; description: string }> = {
  POSTS: {
    title: "Hali post yo'q",
    description: "Birinchi videongizni joylang — u shu yerda va lentada ko'rinadi.",
  },
  SAVED: {
    title: "Saqlangan post yo'q",
    description: "Yoqqan videoni belgilab qo'ying — keyin shu yerdan topasiz.",
  },
  LIKED: {
    title: "Yoqtirgan post yo'q",
    description: "Yurakchani bosgan videolaringiz shu yerda yig'iladi.",
  },
};

/**
 * Feed ichidagi "Mening profilim".
 *
 * ── Nima uchun ilovaning profil sahifasidan ALOHIDA ───────────────────
 * `/profile` — hisobning boshqaruv paneli: hamyon, buyurtmalar,
 * manzillar, qurilmalar, xavfsizlik, huquqiy hujjatlar. U yerga
 * kontent qo'shsak, sahifa ikki xil ish qiladigan bo'lib qolardi.
 *
 * Bu yerda esa faqat IJOD: postlarim, saqlaganlarim, yoqtirganlarim
 * va ularning sonlari. Xuddi Instagram yoki TikTok profilidagi kabi.
 *
 * Sozlamalar tugmasi hisob sahifasiga olib boradi — takrorlanmaydi.
 */
export function FeedProfileContent() {
  const create = useFeedCreate();

  const [tab, setTab] = useState<TabValue>('POSTS');

  /**
   * Profil BITTA so'rovda olinadi.
   *
   * Tizimga kirgan odamning ma'lumotida `username` yo'q, shuning
   * uchun avval nomni, keyin profilni so'rash kerak bo'lardi — bu
   * mobil internetda sahifani ikki marta sakratardi.
   */
  const profile = useApiQuery<PublicProfileResponse>('/api/v1/feed/me');
  const username = profile.data?.profile.username ?? null;

  const path =
    tab === 'SAVED'
      ? '/api/v1/feed/saved'
      : tab === 'LIKED'
        ? '/api/v1/feed/liked'
        : username
          ? `/api/v1/users/${username}/posts`
          : null;

  const list = useCursorList<PostView>(path, 'posts');
  const actions = usePostActions(list.setItems);

  const info = profile.data?.profile ?? null;
  const isEmpty = !list.isLoading && !list.error && list.items.length === 0;

  /**
   * Postlar yorlig'i PANJARADA, qolganlari ro'yxatda.
   *
   * O'z sahifasida odam "nima joylaganman?" deb qaraydi — panjarada
   * hammasi bir ekranga sig'adi. Saqlangan va yoqtirganlar orasida
   * esa matnli postlar ham bor: ular panjarada bo'sh katak bo'lib
   * turardi.
   */
  const isGrid = tab === 'POSTS';

  return (
    <>
      <FeedHeader title="Profil" />

      <div className="pb-tabbar space-y-5 px-4 pt-4">
        {profile.error && (
          <Alert variant="error" title="Profilni yuklab bo'lmadi">
            {profile.error}
          </Alert>
        )}

        {profile.isLoading && <Skeleton className="h-32 rounded-2xl" />}

        {info && (
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar src={info.avatarUrl} name={info.fullName ?? info.username} size="lg" />

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-base font-semibold">
                  <span className="truncate">{info.fullName ?? formatUsername(info.username)}</span>
                  {info.isVerified && (
                    <BadgeCheck className="text-primary size-4 shrink-0" aria-label="Tasdiqlangan" />
                  )}
                </p>
                <p className="text-muted-foreground truncate text-sm">{formatUsername(info.username)}</p>
              </div>

              <Button variant="ghost" size="icon" aria-label="Sozlamalar" asChild>
                <Link href="/feed/settings">
                  <Settings className="size-5" aria-hidden="true" />
                </Link>
              </Button>
            </div>

            {info.bio && <p className="text-sm whitespace-pre-wrap">{info.bio}</p>}

            {/* Sonlar — bosiladigan emas: obunachilar ro'yxati keyingi bosqichda. */}
            <dl className="border-border grid grid-cols-3 gap-2 rounded-2xl border p-3 text-center">
              <Stat label="Postlar" value={info.postCount} />
              <Stat label="Obunachilar" value={info.followerCount} />
              <Stat label="Obuna" value={info.followingCount} />
            </dl>

            <Button variant="outline" fullWidth asChild>
              <Link href="/profile">Profilni tahrirlash</Link>
            </Button>
          </section>
        )}

        {/* Yorliqlar. */}
        <div role="tablist" aria-label="Profil bo'limlari" className="border-border flex gap-1 border-b">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={tab === item.value}
              onClick={() => setTab(item.value)}
              className={cn(
                '-mb-px flex-1 border-b-2 px-2 py-2.5 text-sm transition-colors',
                tab === item.value
                  ? 'border-primary text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground border-transparent',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {actions.error && <Alert variant="error">{actions.error}</Alert>}

        {list.error && (
          <Alert variant="error" title="Ro'yxatni yuklab bo'lmadi">
            {list.error}
          </Alert>
        )}

        {list.isLoading && (
          <div className={cn(isGrid ? 'grid grid-cols-3 gap-1' : 'space-y-3')}>
            {Array.from({ length: isGrid ? 6 : 3 }, (_, index) => (
              <Skeleton key={index} className={cn(isGrid ? 'aspect-[9/16] rounded-lg' : 'h-40 rounded-2xl')} />
            ))}
          </div>
        )}

        {isEmpty && (
          <EmptyState
            icon={Newspaper}
            title={EMPTY[tab].title}
            description={EMPTY[tab].description}
            action={
              tab === 'POSTS' ? (
                <Button variant="outline" onClick={create.open}>
                  Joylash
                </Button>
              ) : undefined
            }
          />
        )}

        {isGrid ? (
          <VideoGrid posts={list.items.filter((post) => post.videoUrl !== null)} />
        ) : (
          <PostList posts={list.items} actions={actions} />
        )}

        {/*
          Panjarada FAQAT videolar ko'rinadi, matnli postlar esa
          pastda ro'yxat bo'lib qo'shiladi — aks holda ular
          umuman ko'rinmay qolardi.
        */}
        {isGrid && list.items.some((post) => post.videoUrl === null) && (
          <PostList posts={list.items.filter((post) => post.videoUrl === null)} actions={actions} />
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
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    /*
      Son YUQORIDA, yozuv pastda.

      Odam sonni qidiradi, yozuvni emas: uni birinchi o'ringa qo'ysak,
      ko'z uchta sonni bir qarashda o'qiydi.
    */
    <div className="flex flex-col">
      <dd className="text-base font-semibold tabular-nums">{formatCompactCount(value)}</dd>
      <dt className="text-muted-foreground text-xs">{label}</dt>
    </div>
  );
}

'use client';

import { Clapperboard } from 'lucide-react';
import { useState } from 'react';

import { FeedHeader } from '@/components/feed/feed-header';
import { useFeedCreate } from '@/components/feed/feed-create-provider';
import { VideoGrid } from '@/components/feed/video-grid';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { VIDEO_FILTERS, videoQueryFor, type VideoFilterValue } from '@/config/feed-nav';
import { useCursorList } from '@/hooks/use-cursor-list';
import { cn } from '@/lib/utils';
import type { PostView } from '@/modules/feed/feed.types';

/**
 * Video sahifasi — Feed modulining 2-bo'limi.
 *
 * ── Nima uchun PANJARA, to'liq ekran emas ─────────────────────────────
 * Ilgari bu manzil to'g'ridan-to'g'ri to'liq ekranli pleyerni ochardi.
 * Ikkita muammosi bor edi:
 *
 *   1. Pleyer butun ekranni egallab, Feed panelini ham to'sib
 *      qo'yardi — odam boshqa bo'limga o'ta olmasdi.
 *   2. Odam qaysi videoni ko'rayotganini TANLAY olmasdi: sahifa
 *      ochilishi bilan tasodifiy video o'ynay boshlardi.
 *
 * Endi bu yerda tanlov bor: panjaradan videoni tanlaydi, tomosha esa
 * `/feed/watch` da to'liq ekranda ochiladi.
 */
export function VideosContent() {
  const create = useFeedCreate();

  const [filter, setFilter] = useState<VideoFilterValue>('ALL');

  const active = VIDEO_FILTERS.find((item) => item.value === filter) ?? VIDEO_FILTERS[0];

  const list = useCursorList<PostView>(videoQueryFor(filter), 'posts');

  const isEmpty = !list.isLoading && !list.error && list.items.length === 0;

  return (
    <>
      <FeedHeader title="Videolar" />

      <div className="space-y-4 px-4 pt-4 pb-24">
        {/* Filtrlar — gorizontal, telefonga sig'ishi uchun. */}
        <div
          role="tablist"
          aria-label="Video turlari"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {VIDEO_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-2 text-sm whitespace-nowrap transition-colors',
                filter === item.value
                  ? 'border-primary bg-primary text-primary-foreground font-medium'
                  : 'border-border hover:bg-secondary',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {list.error && (
          <Alert variant="error" title="Videolarni yuklab bo'lmadi">
            {list.error}
          </Alert>
        )}

        {list.isLoading && (
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }, (_, index) => (
              <Skeleton key={index} className="aspect-[9/16] rounded-lg" />
            ))}
          </div>
        )}

        {isEmpty && (
          <EmptyState
            icon={Clapperboard}
            title={active.emptyTitle}
            description={active.emptyDescription}
            action={
              active.isComingSoon ? undefined : (
                <Button variant="outline" onClick={create.open}>
                  Video joylash
                </Button>
              )
            }
          />
        )}

        <VideoGrid posts={list.items} />

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

'use client';

import { Hash } from 'lucide-react';
import Link from 'next/link';

import { useApiQuery } from '@/hooks/use-api';
import type { HashtagListResponse } from '@/modules/feed/feed.types';

/**
 * Mashhur mavzular — lentaning tepasidagi qator.
 *
 * ── Nima uchun bu KERAK ──────────────────────────────────────────────
 * Yangi kelgan odam hech kimga obuna emas va lentasi bo'sh. Uning
 * oldida ikki yo'l bor: kimnidir qidirish (kimni?) yoki chiqib
 * ketish.
 *
 * Mavzular esa uchinchi yo'lni ochadi: "#poyabzal" ni bosib, o'ziga
 * qiziq narsani darhol topadi va obuna bo'ladigan odamni ham shu
 * yerda ko'radi.
 *
 * ── Nima uchun mavzu YO'Q bo'lsa umuman ko'rinmaydi ──────────────────
 * Bo'sh qator "bu yerda nimadir bo'lishi kerak edi" degan taassurot
 * qoldiradi. Yo'q bo'lsa — yo'q.
 */
export function TrendingHashtags() {
  const { data } = useApiQuery<HashtagListResponse>('/api/v1/hashtags');

  const hashtags = data?.hashtags ?? [];

  if (hashtags.length === 0) return null;

  return (
    <div>
      <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium">
        <Hash className="size-3.5" aria-hidden="true" />
        Mashhur mavzular
      </p>

      {/*
        Gorizontal surish: mavzular ko'p bo'lsa ular ikkinchi qatorga
        tushib, lentaning yarmini egallab qo'yardi.
      */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {hashtags.map((item) => (
          <Link
            key={item.tag}
            href={`/feed/tag/${item.tag}`}
            className="border-border hover:bg-secondary flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors"
          >
            <span className="font-medium">{`#${item.tag}`}</span>
            <span className="text-muted-foreground tabular-nums">{item.postCount}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

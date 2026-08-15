/* eslint-disable @next/next/no-img-element */
'use client';

import { Eye, Play, ShoppingBag } from 'lucide-react';
import Link from 'next/link';

import { formatReactionCount, type PostView } from '@/modules/feed/feed.types';
import { formatDuration } from '@/modules/upload/upload.types';

export interface VideoGridProps {
  posts: PostView[];
}

/**
 * Videolar panjarasi — uchtadan qator.
 *
 * ── Nima uchun RO'YXAT emas, PANJARA ─────────────────────────────────
 * Bitta ustunda video kartochkalari juda ko'p joy egallaydi: bir
 * ekranda ikkitasi ko'rinadi va tanlash uchun uzoq surish kerak.
 *
 * Panjarada esa bir ekranda 9 tasi turadi — odam bir qarashda
 * qaysinisi qiziqroq ekanini ko'radi va aynan o'shani ochadi.
 * YouTube, Instagram va TikTok ham profil videolarini shunday
 * ko'rsatadi.
 *
 * ── Nima uchun 9:16 (tik) nisbat ─────────────────────────────────────
 * Video telefonda tik holatda suratga olinadi. Kvadrat panjarada
 * kadrning yarmi kesilib ketardi va odam nimani ochayotganini
 * bilmasdi.
 */
export function VideoGrid({ posts }: VideoGridProps) {
  return (
    <ul className="-mx-1 grid grid-cols-3 gap-1">
      {posts.map((post) => (
        <li key={post.id}>
          <Link
            href={`/feed/videos?start=${post.id}`}
            className="bg-secondary relative block aspect-[9/16] overflow-hidden rounded-lg"
          >
            {post.videoPosterUrl ? (
              <img
                src={post.videoPosterUrl}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-muted-foreground flex h-full w-full items-center justify-center">
                <Play className="size-6" aria-hidden="true" />
              </span>
            )}

            {/*
              Pastdagi qorayish: oq matn har qanday kadr ustida
              o'qilishi kerak.
            */}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
              <span className="flex items-center gap-1 text-[11px] font-medium text-white">
                <Eye className="size-3" aria-hidden="true" />
                <span className="tabular-nums">{formatReactionCount(post.viewCount) || '0'}</span>
              </span>
            </span>

            {/* Mahsulot belgisi — bu video SOTUVGA ishlashini bildiradi. */}
            {post.products.length > 0 && (
              <span
                className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white"
                aria-label="Mahsulot biriktirilgan"
              >
                <ShoppingBag className="size-3" aria-hidden="true" />
              </span>
            )}

            {post.videoSeconds !== null && (
              <span className="absolute top-1.5 left-1.5 rounded bg-black/60 px-1 text-[10px] text-white tabular-nums">
                {formatDuration(post.videoSeconds)}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

'use client';

import { ChevronLeft, MessageCircle, Search } from 'lucide-react';
import Link from 'next/link';

import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useApiQuery } from '@/hooks/use-api';

interface ConversationsCountResponse {
  totalUnread: number;
}

export interface FeedHeaderProps {
  /** Sahifa nomi — bosh sahifada "Feed". */
  title: string;
  /** Qidiruv belgisi ko'rinsinmi (qidiruv sahifasining o'zida ortiqcha). */
  showSearch?: boolean;
}

/** Nishondagi son: 9 dan oshsa "9+" — aks holda tugmadan chiqib ketardi. */
function badgeText(count: number): string {
  return count > 9 ? '9+' : String(count);
}

/**
 * Feed modulining yuqori paneli.
 *
 * ── Nima uchun ilovaning umumiy panelidan ALOHIDA ─────────────────────
 * Umumiy panelda bildirishnoma qo'ng'irog'i turadi va u butun ilovaga
 * tegishli. Feed ichida esa boshqa narsa kerakroq: QIDIRUV.
 *
 * Qidiruv ilgari pastki panelda edi. Lekin pastki panelda faqat
 * beshta joy bor va ular kontent bo'limlari uchun: odam u yerdan
 * "qayerga boraman?" degan savolga javob qidiradi. Qidiruv esa
 * amal, bo'lim emas — uning joyi tepada.
 *
 * ── Nima uchun "orqaga" tugmasi QOLDIRILDI ────────────────────────────
 * Maketda u yo'q, lekin Feed ichida ilovaning umumiy paneli
 * yashirilgan. Busiz odam modul ichida qamalib qolardi — bu
 * chiroylilikdan ko'ra muhimroq.
 *
 * U ataylab kichik va och rangda: ko'zga tashlanmaydi, lekin
 * kerak bo'lganda joyida turadi.
 */
export function FeedHeader({ title, showSearch = true }: FeedHeaderProps) {
  /**
   * O'qilmagan xabarlar soni.
   *
   * Eng kichik sahifa so'raladi: bizga faqat SON kerak, suhbatlar
   * ro'yxati emas.
   */
  const { data } = useApiQuery<ConversationsCountResponse>('/api/v1/chat/conversations?pageSize=1', {
    refreshIntervalMs: 45_000,
  });

  const unread = data?.totalUnread ?? 0;

  return (
    <header className="glass-chrome sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-15 max-w-lg items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-0.5">
          <Link
            href="/dashboard"
            aria-label="Bosh sahifaga qaytish"
            className="tap-target text-muted-foreground hover:bg-secondary/60 hover:text-foreground -ml-2 inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Link>

          {/*
            Sarlavha KATTA va qalin.

            Maketdagi kabi: u sahifaning nomi emas, bo'limning
            belgisi. Katta yozuv odamga "men Feed ichidaman" deb
            aytadi va qolgan ikonkalar undan kichik turadi.
          */}
          <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          {showSearch && (
            <Link
              href="/feed/search"
              aria-label="Qidirish"
              className="hover:bg-secondary/60 focus-visible:ring-ring inline-flex size-11 items-center justify-center rounded-lg transition-colors focus-visible:ring-2"
            >
              <Search className="size-5" aria-hidden="true" />
            </Link>
          )}

          <Link
            href="/messages"
            aria-label={unread > 0 ? `Suhbatlar, ${unread} ta o'qilmagan` : 'Suhbatlar'}
            className="hover:bg-secondary/60 focus-visible:ring-ring relative inline-flex size-11 items-center justify-center rounded-lg transition-colors focus-visible:ring-2"
          >
            <MessageCircle className="size-5" aria-hidden="true" />

            {unread > 0 && (
              <span
                className="bg-destructive text-destructive-foreground absolute top-2 right-2 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[0.625rem] leading-4 font-semibold tabular-nums"
                aria-hidden="true"
              >
                {badgeText(unread)}
              </span>
            )}
          </Link>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

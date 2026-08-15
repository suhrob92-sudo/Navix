'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useFeedCreate } from '@/components/feed/feed-create-provider';
import { FEED_NAV, isFeedNavActive, isFullScreenFeedPage } from '@/config/feed-nav';
import { cn } from '@/lib/utils';

/**
 * Feed modulining O'Z pastki paneli.
 *
 * ── Nima uchun ilovaning umumiy paneli o'rniga ────────────────────────
 * Feed endi bitta sahifa emas — ichida beshta mustaqil bo'lim bor.
 * Ularni umumiy panelga qo'shib bo'lmaydi: u yerda beshta joy bor va
 * ular butun ilova uchun (bosh sahifa, qidiruv, AI, Feed, profil).
 *
 * Shuning uchun Feed ochilganda pastki panel ALMASHADI. Bir ekranda
 * ikkita panel turishi mumkin emas: barmoq qaysi biriga tegishini
 * bilmay qolardi va ekranning pastki qismi butunlay yo'qolardi.
 *
 * ── Odam qanday chiqadi ───────────────────────────────────────────────
 * Har bir Feed sahifasining tepasida "orqaga" tugmasi bor — u bosh
 * sahifaga qaytaradi va umumiy panel joyiga keladi.
 */
export function FeedTabBar() {
  const pathname = usePathname();
  const create = useFeedCreate();

  /**
   * To'liq ekranli tomoshada panel CHIZILMAYDI.
   *
   * Video butun ekranni egallaydi va panel uning ustiga tushib,
   * yoqtirish bilan mahsulot tugmasini to'sib qo'yardi.
   */
  if (isFullScreenFeedPage(pathname)) return null;

  return (
    <nav
      className="glass-chrome fixed inset-x-0 bottom-0 z-40 border-t"
      aria-label="Feed navigatsiyasi"
      // iPhone'dagi pastki chiziq ustiga tushib qolmasligi uchun.
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-end justify-around px-2">
        {FEED_NAV.map((item) => {
          const Icon = item.icon;
          const active = isFeedNavActive(pathname, item);

          /*
            Markazdagi "yaratish" — TUGMA, havola emas.

            U sahifa ochmaydi, oyna ochadi. Havola qilsak, brauzer
            tarixiga yozilib qolardi va "orqaga" bosgan odam bo'sh
            sahifaga tushardi.
          */
          if (item.isCreate) {
            return (
              <li key={item.label} className="flex-1">
                <button
                  type="button"
                  onClick={create.open}
                  aria-label="Yaratish"
                  className="flex w-full flex-col items-center"
                >
                  <span className="from-brand-from to-brand-to shadow-brand-from/35 -mt-5 inline-flex size-13 items-center justify-center rounded-full bg-gradient-to-br shadow-lg transition-transform active:scale-95">
                    <Icon className="text-brand-foreground size-7" aria-hidden="true" />
                  </span>

                  <span className="text-muted-foreground pt-1 pb-2 text-[0.625rem] leading-none font-medium">
                    {item.label}
                  </span>
                </button>
              </li>
            );
          }

          return (
            <li key={item.label} className="flex-1">
              <Link
                href={item.href ?? '/feed'}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 px-1 pt-2.5 pb-2 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="size-5.5" aria-hidden="true" />
                <span className="text-[0.625rem] leading-none font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FEED_SETTINGS_ITEMS, type FeedSettingsItem } from '@/config/feed-settings-nav';
import { useFeedSettings } from '@/hooks/use-feed-settings';
import { cn } from '@/lib/utils';

/**
 * Feed sozlamalari — bosh ro'yxat.
 *
 * ── Nima uchun ilovaning sozlamalaridan ALOHIDA ───────────────────────
 * `/profile/settings` — hisobga tegishli: til, mavzu, tug'ilgan sana.
 * Bu yerda esa faqat LENTA: nimani ko'rasiz, kim izoh yozadi, qaysi
 * xabar keladi.
 *
 * Ikkalasini birlashtirsak, ro'yxat yigirma qatorga cho'zilardi va
 * odam keragini topa olmasdi.
 */
export function FeedSettingsContent() {
  const { error, isSaving, reset } = useFeedSettings();

  const [isResetOpen, setIsResetOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * Keshni tozalash.
   *
   * ── Nima uchun bu HAQIQATAN ish qiladi ──────────────────────────────
   * Brauzer saqlagan javoblar (Cache Storage) va xizmat ishchisi
   * o'chiriladi. Bu "eski ma'lumot ko'rinyapti" muammosining eng
   * keng tarqalgan sababi.
   *
   * Kirish tokeni TEGILMAYDI: odam kesh tozalab, hisobidan chiqib
   * ketishini kutmaydi.
   */
  async function clearCache() {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();

        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      setNotice("Kesh tozalandi. Sahifa yangilanganda so'nggi ma'lumot yuklanadi.");
    } catch {
      setNotice("Keshni tozalab bo'lmadi. Brauzer sozlamalaridan urinib ko'ring.");
    }
  }

  async function handleReset() {
    await reset();
    setIsResetOpen(false);
    setNotice("Tavsiyalar tiklandi. Lenta endi noldan o'rganadi.");
  }

  function onAction(item: FeedSettingsItem) {
    setNotice(null);

    if (item.id === 'CACHE') {
      void clearCache();

      return;
    }

    if (item.id === 'RESET') setIsResetOpen(true);
  }

  return (
    <>
      <AppHeader title="Sozlamalar" showBack backHref="/feed/profile" />

      <div className="pb-tabbar space-y-4 px-4 pt-4">
        {error && <Alert variant="error">{error}</Alert>}
        {notice && <Alert variant="success">{notice}</Alert>}

        <nav className="divide-border border-border divide-y overflow-hidden rounded-2xl border">
          {FEED_SETTINGS_ITEMS.map((item) => {
            const Icon = item.icon;

            const inner = (
              <>
                <span
                  className={cn(
                    'inline-flex size-9 shrink-0 items-center justify-center rounded-lg',
                    item.isDanger ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground',
                  )}
                >
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>

                <span className="min-w-0 flex-1 text-left">
                  <span className={cn('block truncate text-sm font-medium', item.isDanger && 'text-destructive')}>
                    {item.label}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">{item.description}</span>
                </span>

                <ChevronRight className="text-muted-foreground size-4.5 shrink-0" aria-hidden="true" />
              </>
            );

            const className = 'hover:bg-secondary/50 flex w-full items-center gap-3 px-4 py-3.5 transition-colors';

            return item.href ? (
              <Link key={item.id} href={item.href} className={className}>
                {inner}
              </Link>
            ) : (
              <button key={item.id} type="button" onClick={() => onAction(item)} className={className}>
                {inner}
              </button>
            );
          })}
        </nav>
      </div>

      <ConfirmDialog
        open={isResetOpen}
        title="Feedni tiklaysizmi?"
        description="Tanlangan qiziqishlar va rad etilgan bo'limlar o'chadi. Maxfiylik va bildirishnoma sozlamalari o'z joyida qoladi."
        confirmLabel="Tiklashni boshlash"
        isLoading={isSaving}
        isDestructive
        onConfirm={() => void handleReset()}
        onCancel={() => setIsResetOpen(false)}
      />
    </>
  );
}

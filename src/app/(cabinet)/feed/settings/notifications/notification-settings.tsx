'use client';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useFeedSettings } from '@/hooks/use-feed-settings';
import { NOTIFY_ITEMS } from '@/modules/feed/settings.types';

/**
 * Bildirishnoma sozlamalari.
 *
 * ── Nima uchun har biri ALOHIDA ───────────────────────────────────────
 * Bitta "bildirishnomalarni o'chirish" tugmasi qulay ko'rinardi, lekin
 * amalda odam hammasini o'chirib qo'yardi va shu bilan MUHIM
 * xabarlarni ham yo'qotardi.
 *
 * Alohida tugmalar esa aniq muammoni hal qiladi: "yoqtirishlar juda
 * ko'p keladi" degan odam faqat o'shani o'chiradi va izohlarni
 * ko'raveradi.
 */
export function NotificationSettingsContent() {
  const { settings, isLoading, error, save } = useFeedSettings();

  return (
    <>
      <AppHeader title="Bildirishnomalar" showBack backHref="/feed/settings" />

      <div className="pb-tabbar space-y-4 px-4 pt-4">
        {error && <Alert variant="error">{error}</Alert>}

        {isLoading && <Skeleton className="h-64 rounded-2xl" />}

        {!isLoading && (
          <div className="divide-border border-border divide-y overflow-hidden rounded-2xl border">
            {NOTIFY_ITEMS.map((item) => (
              <div key={item.key} className="p-4">
                <Switch
                  checked={settings[item.key]}
                  /*
                    Tayyor bo'lmagan sozlama O'CHIRILGAN holda turadi.

                    Uni yashirmaymiz: odam nima kutayotganini bilib
                    tursin. Lekin bosishga ruxsat bersak, hech narsaga
                    ta'sir qilmaydigan tugma bo'lardi.
                  */
                  disabled={item.isComingSoon}
                  onCheckedChange={(checked) => void save({ [item.key]: checked })}
                  label={item.isComingSoon ? `${item.label} — tez orada` : item.label}
                  description={item.description}
                />
              </div>
            ))}
          </div>
        )}

        <p className="text-muted-foreground text-xs">
          Bu sozlamalar Feed bildirishnomalariga tegishli. Buyurtma va to&apos;lov xabarlari o&apos;chirilmaydi —
          ular hisobingiz uchun muhim.
        </p>
      </div>
    </>
  );
}

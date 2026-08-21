'use client';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { POST_CATEGORIES } from '@/config/feed-nav';
import { useFeedSettings } from '@/hooks/use-feed-settings';
import { cn } from '@/lib/utils';
import type { PostCategoryName } from '@/modules/feed/feed.types';

/**
 * Kontent sozlamalari.
 *
 * ── Nima uchun bo'limlar EMAS, erkin mavzular emas ────────────────────
 * "Musiqa", "Sport" kabi erkin mavzular chiroyli ko'rinardi, lekin
 * postlarda bunday belgi YO'Q — ya'ni tanlov hech narsaga ta'sir
 * qilmasdi. Ishlamaydigan tugma esa aldash bilan barobar.
 *
 * Shuning uchun ro'yxat HAQIQIY bo'limlardan: post joylashda aynan
 * shular tanlanadi va lenta aynan shular bo'yicha filtrlanadi.
 */
export function ContentSettingsContent() {
  const { settings, isLoading, error, save } = useFeedSettings();

  function toggleInterest(value: PostCategoryName) {
    const next = settings.interests.includes(value)
      ? settings.interests.filter((item) => item !== value)
      : [...settings.interests, value];

    void save({ interests: next });
  }

  function toggleNotInterested(value: PostCategoryName) {
    const next = settings.notInterested.includes(value)
      ? settings.notInterested.filter((item) => item !== value)
      : [...settings.notInterested, value];

    void save({ notInterested: next });
  }

  return (
    <>
      <AppHeader title="Kontent sozlamalari" showBack backHref="/feed/settings" />

      <div className="pb-tabbar space-y-6 px-4 pt-4">
        {error && <Alert variant="error">{error}</Alert>}

        {isLoading && <Skeleton className="h-40 rounded-2xl" />}

        {!isLoading && (
          <>
            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Qiziqish mavzulari</h2>
              <p className="text-muted-foreground text-xs">
                Tanlangan bo&apos;limlar lentangizda ko&apos;rinadi. Hech biri tanlanmasa — hammasi ko&apos;rinadi.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {POST_CATEGORIES.map((item) => {
                  const value = item.value as PostCategoryName;
                  const isOn = settings.interests.includes(value);

                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={isOn}
                      onClick={() => toggleInterest(value)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                        isOn
                          ? 'border-primary bg-primary text-primary-foreground font-medium'
                          : 'border-border hover:bg-secondary',
                      )}
                    >
                      <span aria-hidden="true">{item.emoji}</span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-semibold">Qizig&apos;i emas</h2>
              <p className="text-muted-foreground text-xs">
                Bu bo&apos;limlar lentangizga umuman tushmaydi. Bo&apos;limni bu yerda tanlasangiz, u
                qiziqishlardan olib tashlanadi.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {POST_CATEGORIES.map((item) => {
                  const value = item.value as PostCategoryName;
                  const isOn = settings.notInterested.includes(value);

                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={isOn}
                      onClick={() => toggleNotInterested(value)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                        isOn
                          ? 'border-destructive bg-destructive/10 text-destructive font-medium'
                          : 'border-border hover:bg-secondary',
                      )}
                    >
                      <span aria-hidden="true">{item.emoji}</span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="border-border rounded-2xl border p-4">
              <Switch
                checked={settings.sensitiveFilter}
                onCheckedChange={(checked) => void save({ sensitiveFilter: checked })}
                label="Hassos kontent filtri"
                /*
                  Izoh AYNAN nima bo'lishini aytadi.

                  "Noqulay kontentni kamaytiradi" degan noaniq gap
                  odamga hech narsa bermaydi va uni tekshirib ham
                  bo'lmaydi.
                */
                description="Shikoyat qilingan, lekin moderator hali ko'rmagan postlar lentangizda ko'rinmaydi."
              />
            </section>
          </>
        )}
      </div>
    </>
  );
}

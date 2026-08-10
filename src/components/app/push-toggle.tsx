'use client';

import { BellOff, BellRing } from 'lucide-react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePush } from '@/hooks/use-push';

/**
 * "Telefonga xabar yuborish" sozlamasi.
 *
 * ── Nima uchun alohida karta ──────────────────────────────────────────
 * Push — ilovadagi eng qimmatli, ayni paytda eng bezovta qiluvchi
 * imkoniyat. U yashirin sozlamalar ichida turmasligi kerak: odam uni
 * osongina yoqishi ham, o'chirishi ham kerak.
 *
 * ── Nima uchun holatlar ANIQ aytiladi ─────────────────────────────────
 * "Ishlamadi" degan umumiy xabar foydasiz. Sabab har xil bo'lishi
 * mumkin: brauzer eski, server sozlanmagan yoki odam o'zi rad etgan.
 * Uchinchi holatni kod tuzata olmaydi — buni ochiq aytish kerak.
 */
export function PushToggle() {
  const { state, error, enable, disable, isBusy } = usePush();

  if (state === 'loading') return null;

  if (state === 'unsupported') {
    return (
      <Card className="p-4">
        <p className="text-muted-foreground text-sm leading-relaxed">
          Bu brauzer telefonga xabar yuborishni qo&apos;llab-quvvatlamaydi. Chrome yoki Safari&apos;ning yangi
          versiyasidan foydalaning.
        </p>
      </Card>
    );
  }

  if (state === 'unconfigured') {
    /*
      Server tomonda VAPID kalitlari yo'q.

      Bu foydalanuvchining muammosi emas — shuning uchun unga umuman
      ko'rsatilmaydi. Kartani ko'rsatib "sozlanmagan" deyish odamni
      chalkashtirardi.
    */
    return null;
  }

  const isOn = state === 'on';

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        {isOn ? (
          <BellRing className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
        ) : (
          <BellOff className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden="true" />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Telefonga xabar</p>

          <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
            {state === 'blocked'
              ? "Brauzer sozlamalarida xabar yuborish taqiqlangan. Uni faqat brauzerning o'zidan qayta ochish mumkin."
              : isOn
                ? "Ilova yopiq bo'lsa ham xabar va qo'ng'iroq haqida bilib turasiz."
                : "Ilova yopiq bo'lganda ham xabar va qo'ng'iroqni o'tkazib yubormaslik uchun yoqing."}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}

      {state !== 'blocked' && (
        <Button
          variant={isOn ? 'outline' : 'primary'}
          className="mt-3 w-full"
          isLoading={isBusy}
          onClick={() => void (isOn ? disable() : enable())}
        >
          {isOn ? "O'chirish" : 'Yoqish'}
        </Button>
      )}
    </Card>
  );
}

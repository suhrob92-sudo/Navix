'use client';

import { Crosshair, MapPin, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UZ_REGIONS, UZ_REGION_CENTERS, nearestRegion, type UzRegion } from '@/config/geo';
import { dialogCancelHandler } from '@/lib/dialog';
import { cn } from '@/lib/utils';
import { MAX_PLACE_DETAIL_LENGTH, buildPlaceName, type PostPlaceView } from '@/modules/feed/feed.types';

export interface LocationPickerProps {
  onPick: (place: PostPlaceView) => void;
  onCancel: () => void;
}

/** Telefondan joylashuv so'rash muddati. */
const GEO_TIMEOUT_MS = 12_000;

/**
 * Joylashuv tanlash.
 *
 * ── Nima uchun IKKI yo'l ──────────────────────────────────────────────
 * Telefon joylashuvi eng qulay, lekin u har doim ishlamaydi: odam
 * ruxsat bermasligi, GPS o'chiq bo'lishi yoki ichkarida signal
 * yo'qolishi mumkin.
 *
 * Bundan tashqari odam har doim ham O'ZI turgan joyni ko'rsatmoqchi
 * emas: restoran egasi uydan turib restorani haqida video joylashi
 * mumkin.
 *
 * Shuning uchun ro'yxatdan qo'lda tanlash ham bor va u teng huquqli
 * yo'l — "zaxira" emas.
 *
 * ── Nima uchun tashqi xarita YO'Q ─────────────────────────────────────
 * Xarita chiroyli ko'rinardi, lekin u tashqi xizmatga (Google yoki
 * Yandex) bog'lanardi: pullik kalit, sekin yuklanish va eng
 * muhimi — foydalanuvchi koordinatasi begona serverga ketardi.
 *
 * O'n to'rtta hudud esa telefonda bir ekranga sig'adi.
 */
export function LocationPicker({ onPick, onCancel }: LocationPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [region, setRegion] = useState<UzRegion | null>(null);
  const [detail, setDetail] = useState('');
  const [precise, setPrecise] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function locate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError("Bu brauzer joylashuvni qo'llab-quvvatlamaydi. Ro'yxatdan tanlang.");

      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        /**
         * Koordinata NOMGA aylantiriladi.
         *
         * Odamga "41.31, 69.24" hech narsa demaydi. Eng yaqin hudud
         * markazini topib, uning nomini qo'yamiz — bu tashqi
         * xizmatsiz bajariladi.
         */
        setPrecise(point);
        setRegion(nearestRegion(point));
        setIsLocating(false);
      },
      (caught) => {
        setIsLocating(false);
        setError(
          caught.code === caught.PERMISSION_DENIED
            ? "Joylashuvga ruxsat berilmadi. Ro'yxatdan qo'lda tanlashingiz mumkin."
            : "Joylashuvni aniqlab bo'lmadi. Ro'yxatdan tanlang.",
        );
      },
      { enableHighAccuracy: false, timeout: GEO_TIMEOUT_MS, maximumAge: 60_000 },
    );
  }

  function confirm() {
    if (!region) return;

    /**
     * Qo'lda tanlanganda hudud MARKAZI olinadi.
     *
     * Aniq nuqta yo'q, lekin "yaqin atrofda" baribir ishlashi kerak.
     * Viloyat markazi — eng halol taxmin va u odamning haqiqiy
     * joyini oshkor qilmaydi.
     */
    const point = precise ?? UZ_REGION_CENTERS[region];

    onPick({
      name: buildPlaceName(region, detail),
      latitude: point.latitude,
      longitude: point.longitude,
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={dialogCancelHandler(onCancel)}
      className="text-foreground bg-card animate-fade-up mt-auto mb-0 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-5 backdrop:bg-black/50"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Joylashuv</h2>

        <Button type="button" variant="ghost" size="icon" aria-label="Yopish" onClick={onCancel}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>

      <Button
        type="button"
        variant="outline"
        fullWidth
        isLoading={isLocating}
        loadingText="Aniqlanmoqda..."
        onClick={locate}
      >
        <Crosshair className="size-4" aria-hidden="true" />
        Hozirgi joylashuvim
      </Button>

      {error && (
        <Alert variant="warning" className="mt-3">
          {error}
        </Alert>
      )}

      <p className="text-muted-foreground mt-4 mb-2 text-xs">Yoki hududni tanlang</p>

      <div className="flex flex-wrap gap-2">
        {UZ_REGIONS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={region === item}
            onClick={() => {
              setRegion(item);
              // Qo'lda boshqa hudud tanlansa, aniq nuqta endi to'g'ri kelmaydi.
              setPrecise(null);
            }}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm transition-colors',
              region === item
                ? 'border-primary bg-primary text-primary-foreground font-medium'
                : 'border-border hover:bg-secondary',
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label htmlFor="place-detail" className="text-muted-foreground mb-1.5 block text-xs">
          Aniqroq joy (ixtiyoriy)
        </label>

        <Input
          id="place-detail"
          value={detail}
          maxLength={MAX_PLACE_DETAIL_LENGTH}
          placeholder="Masalan: Chilonzor"
          onChange={(event) => setDetail(event.target.value)}
        />
      </div>

      {region && (
        <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-sm">
          <MapPin className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{buildPlaceName(region, detail)}</span>
        </p>
      )}

      {/*
        Maxfiylik haqida OCHIQ yozuv.

        Odam nima ulashayotganini bilishi kerak. "Joylashuv qo'shildi"
        deb jim turish — keyin afsuslanadigan qaror bo'lardi.
      */}
      <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
        Aniq manzilingiz saqlanmaydi — faqat taxminiy joy (~100 metr aniqlikda). Postni ko&apos;rgan
        hamma bu yozuvni ko&apos;radi.
      </p>

      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" fullWidth onClick={onCancel}>
          Bekor qilish
        </Button>

        <Button type="button" fullWidth disabled={!region} onClick={confirm}>
          Qo&apos;shish
        </Button>
      </div>
    </dialog>
  );
}

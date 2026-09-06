'use client';

import { Briefcase, Crosshair, Home, MapPin, X } from 'lucide-react';
import { useCallback, useState } from 'react';

import { PickMap } from '@/components/map/pick-map';
import { Button } from '@/components/ui/button';
import type { Point } from '@/config/delivery-eta';
import { isInsideUzbekistan } from '@/config/taxi';
import { useApiQuery } from '@/hooks/use-api';

/** Tanlangan joy — koordinata va uning nomi. */
export interface ChosenPlace extends Point {
  address: string;
}

interface AddressRow {
  id: string;
  /** `HOME`, `WORK` yoki `OTHER` — belgisi shunga qarab tanlanadi. */
  type: string;
  label: string;
  city: string;
  street: string;
  building: string | null;
  latitude: number;
  longitude: number;
}

interface AddressesResponse {
  addresses: AddressRow[];
}

/**
 * Manzil tanlash oynasi.
 *
 * ── Nima uchun UCH yo'l bor ───────────────────────────────────────────
 * Odam manzilni uch xil holatda tanlaydi va har biri boshqa yo'lni
 * talab qiladi:
 *
 *  1. "Men shu yerdaman" — telefon o'zi biladi, bir bosish;
 *  2. "Uyimga" — saqlangan manzil, bir bosish;
 *  3. "Ana u yerga" — xaritadan qo'lda.
 *
 * Faqat uchinchisini qoldirsak, eng ko'p uchraydigan ikki holat
 * uchun ham xaritani surishga majbur qilardik.
 *
 * ── Nima uchun manzil nomi TAXMINIY ───────────────────────────────────
 * Koordinatani ko'cha nomiga aylantirish uchun geokodlash xizmati
 * kerak — u hozircha yo'q. Shuning uchun xaritadan tanlangan joy
 * "Xaritadagi nuqta" deb nomlanadi va koordinatasi ko'rsatiladi.
 *
 * Bu yolg'on emas: haydovchi baribir xaritadagi nuqtaga qarab
 * boradi, nomga emas.
 */

export interface PlaceSheetProps {
  title: string;
  /** Xarita qayerdan ochilsin — odatda foydalanuvchining hozirgi joyi. */
  fallbackCenter: Point;
  onChoose: (place: ChosenPlace) => void;
  onClose: () => void;
}

/** Toshkent markazi — hech narsa ma'lum bo'lmaganda xarita shu yerdan ochiladi. */
export const DEFAULT_CENTER: Point = { latitude: 41.3111, longitude: 69.2797 };

function addressText(row: AddressRow): string {
  const parts = [row.street, row.building].filter(Boolean).join(', ');

  return parts ? `${row.label} — ${parts}` : row.label;
}

/**
 * Manzil turiga mos belgi.
 *
 * Uy va ish — eng ko'p ishlatiladigan ikkitasi va ular ko'z bilan
 * bir-biridan farq qilishi kerak. Hammasiga bir xil uy belgisi
 * qo'yilsa, ro'yxatni o'qishga to'g'ri kelardi.
 */
function iconFor(type: string) {
  if (type === 'WORK') return Briefcase;

  return Home;
}

function pointText(point: Point): string {
  return `Xaritadagi nuqta (${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)})`;
}

export function PlaceSheet({ title, fallbackCenter, onChoose, onClose }: PlaceSheetProps) {
  const { data } = useApiQuery<AddressesResponse>('/api/v1/addresses');

  /**
   * Xarita markazi va "kalit".
   *
   * `mapKey` o'zgarganda `PickMap` qaytadan ochiladi va yangi markazga
   * ko'chadi. Bu — effekt bilan holatni sinxronlashning o'rniga
   * React ning o'z usuli (sabab `pick-map.tsx` da yozilgan).
   */
  const [center, setCenter] = useState<Point>(fallbackCenter);
  const [mapKey, setMapKey] = useState(0);

  /** Xaritada hozir turgan nuqta — hali tasdiqlanmagan. */
  const [picked, setPicked] = useState<Point>(fallbackCenter);

  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const useMyLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationError('Bu qurilma joylashuvni aniqlay olmaydi.');

      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point: Point = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        setLocating(false);

        /*
          Chet eldagi koordinata rad etiladi: server ham uni qabul
          qilmaydi, lekin xatoni SHU YERDA aytish tezroq va
          tushunarliroq.
        */
        if (!isInsideUzbekistan(point)) {
          setLocationError("Joylashuvingiz O'zbekistondan tashqarida ko'rinmoqda.");

          return;
        }

        setCenter(point);
        setPicked(point);
        setMapKey((value) => value + 1);
      },
      () => {
        setLocating(false);
        setLocationError('Joylashuvga ruxsat berilmadi. Manzilni xaritadan tanlang.');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

  const saved = data?.addresses ?? [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/45 backdrop-blur-sm">
      {/* Yuqoridagi bo'sh joyni bosish ham oynani yopadi. */}
      <button type="button" className="flex-1" aria-label="Yopish" onClick={onClose} />

      <div className="bg-background mx-auto flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl shadow-2xl">
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="hover:bg-secondary text-muted-foreground rounded-full p-2 transition-colors"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2 p-4">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="border-border hover:bg-secondary/60 flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors disabled:opacity-60"
            >
              <span className="bg-primary/12 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                <Crosshair className="size-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium">{locating ? 'Aniqlanmoqda...' : 'Mening joylashuvim'}</span>
            </button>

            {locationError && <p className="text-destructive px-1 text-xs leading-relaxed">{locationError}</p>}

            {saved.map((row) => {
              const RowIcon = iconFor(row.type);

              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() =>
                    onChoose({
                      latitude: row.latitude,
                      longitude: row.longitude,
                      address: addressText(row),
                    })
                  }
                  className="border-border hover:bg-secondary/60 flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors"
                >
                  <span className="bg-secondary text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
                    <RowIcon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{row.label}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {[row.city, row.street, row.building].filter(Boolean).join(', ')}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-border border-t px-4 py-3">
            <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              Xaritani surib, belgini kerakli joyga qo&apos;ying
            </p>
          </div>

          <PickMap
            key={mapKey}
            center={center}
            onPick={setPicked}
            height={280}
            label="Manzilni tanlash uchun xarita"
          />
        </div>

        <div className="border-border bg-background border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button fullWidth size="lg" onClick={() => onChoose({ ...picked, address: pointText(picked) })}>
            Shu nuqtani tanlash
          </Button>
        </div>
      </div>
    </div>
  );
}

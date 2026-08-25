'use client';

import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FilterChip } from '@/components/ui/filter-chip';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  AMENITY_OPTIONS,
  HOTEL_SORT_OPTIONS,
  STAR_OPTIONS,
  activeHotelFilterCount,
  hotelPriceRangeError,
  type HotelFilterKey,
  type HotelFilters,
} from '@/config/hotel-filters';
import { cn } from '@/lib/utils';

/**
 * Mehmonxona filtrlari oynasi.
 *
 * ── Nima uchun PASTDAN chiqadigan oyna ────────────────────────────────
 * Sabab `market/filter-sheet.tsx` dagi bilan bir xil: telefonda yon
 * panel uchun joy yo'q, pastdan chiqadigan oyna esa barmoq
 * yetadigan joyda ochiladi.
 *
 * ── Nima uchun natija DARHOL o'zgarmaydi ──────────────────────────────
 * Odam bir necha shartni ketma-ket tanlaydi: narx, keyin yulduz,
 * keyin qulayliklar. Har birida so'rov ketsa, uchta keraksiz so'rov
 * va uchta miltillash bo'lardi.
 *
 * ── Nima uchun TUMAN har doim ko'rinmaydi ─────────────────────────────
 * Tuman faqat SHAHAR tanlangandan keyin ma'noga ega: "Mirobod"
 * degan tanlov Buxoro ro'yxatida hech narsa topmasdi.
 *
 * Shuning uchun u shahar tanlangunicha umuman chizilmaydi.
 */

export interface HotelFilterSheetProps {
  filters: HotelFilters;
  /** Mavjud shaharlar — serverdan keladi. */
  cities: readonly string[];
  /** Tanlangan shahardagi tumanlar. Shahar tanlanmagan bo'lsa bo'sh. */
  districts: readonly string[];
  onApply: (next: HotelFilters) => void;
  onClearAll: () => void;
  skip?: readonly HotelFilterKey[];
  className?: string;
}

export function HotelFilterSheet({
  filters,
  cities,
  districts,
  onApply,
  onClearAll,
  skip,
  className,
}: HotelFilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const count = activeHotelFilterCount(filters, skip);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)} className={cn('shrink-0', className)}>
        <SlidersHorizontal className="size-4" aria-hidden="true" />
        Filtr
        {count > 0 && (
          <span className="bg-primary text-primary-foreground ml-0.5 inline-flex size-5 items-center justify-center rounded-full text-[0.625rem] font-semibold tabular-nums">
            {count}
          </span>
        )}
      </Button>

      {isOpen && (
        <HotelFilterDialog
          filters={filters}
          cities={cities}
          districts={districts}
          onClose={() => setIsOpen(false)}
          onApply={(next) => {
            onApply(next);
            setIsOpen(false);
          }}
          onClearAll={() => {
            onClearAll();
            setIsOpen(false);
          }}
        />
      )}
    </>
  );
}

/** Oynaning o'zi — ochilgandagina chiziladi. */
function HotelFilterDialog({
  filters,
  cities,
  districts,
  onClose,
  onApply,
  onClearAll,
}: {
  filters: HotelFilters;
  cities: readonly string[];
  districts: readonly string[];
  onClose: () => void;
  onApply: (next: HotelFilters) => void;
  onClearAll: () => void;
}) {
  /** Oyna ichidagi vaqtinchalik tanlov — sabab komponent izohida. */
  const [draft, setDraft] = useState<HotelFilters>(filters);
  const [minText, setMinText] = useState(filters.minPriceSom === undefined ? '' : String(filters.minPriceSom));
  const [maxText, setMaxText] = useState(filters.maxPriceSom === undefined ? '' : String(filters.maxPriceSom));

  const toNumber = (value: string): number | undefined => {
    const trimmed = value.trim();

    if (trimmed === '') return undefined;

    const parsed = Number(trimmed);

    return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
  };

  const candidate: HotelFilters = {
    ...draft,
    minPriceSom: toNumber(minText),
    maxPriceSom: toNumber(maxText),
  };

  const rangeError = hotelPriceRangeError(candidate);

  const toggleAmenity = (amenity: string) => {
    const current = draft.amenities ?? [];
    const next = current.includes(amenity)
      ? current.filter((item) => item !== amenity)
      : [...current, amenity];

    setDraft({ ...draft, amenities: next.length > 0 ? next : undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-card animate-slide-up max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Filtr</h2>

          <button
            type="button"
            aria-label="Yopish"
            onClick={onClose}
            className="text-muted-foreground hover:bg-secondary inline-flex size-8 items-center justify-center rounded-lg transition-colors"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-5">
          {/* ── Saralash ── */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium">Saralash</h3>

            <div className="flex flex-wrap gap-2">
              {HOTEL_SORT_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={draft.sort === option.value}
                  onClick={() => setDraft({ ...draft, sort: option.value })}
                />
              ))}
            </div>
          </section>

          {/* ── Shahar ── */}
          {cities.length > 0 && (
            <section>
              <h3 className="text-muted-foreground mb-2 text-xs font-medium">Shahar</h3>

              <div className="flex flex-wrap gap-2">
                <FilterChip
                  label="Barchasi"
                  active={draft.city === undefined}
                  /* Shahar o'zgarsa TUMAN ham tozalanadi — u boshqa shaharda yo'q. */
                  onClick={() => setDraft({ ...draft, city: undefined, district: undefined })}
                />

                {cities.map((city) => (
                  <FilterChip
                    key={city}
                    label={city}
                    active={draft.city === city}
                    onClick={() => setDraft({ ...draft, city, district: undefined })}
                  />
                ))}
              </div>
            </section>
          )}

          {/*
            ── Tuman ──
            Faqat SHAHAR tanlangan va o'sha shaharda kamida ikkita
            tuman bo'lganda. Bitta tumanli ro'yxat hech narsani
            filtrlamaydi — u shunchaki ekranni to'ldirardi.
          */}
          {draft.city !== undefined && draft.city === filters.city && districts.length > 1 && (
            <section>
              <h3 className="text-muted-foreground mb-2 text-xs font-medium">Tuman</h3>

              <div className="flex flex-wrap gap-2">
                <FilterChip
                  label="Barchasi"
                  active={draft.district === undefined}
                  onClick={() => setDraft({ ...draft, district: undefined })}
                />

                {districts.map((district) => (
                  <FilterChip
                    key={district}
                    label={district}
                    active={draft.district === district}
                    onClick={() => setDraft({ ...draft, district })}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── Narx ── */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium">Bir kecha narxi (so&apos;m)</h3>

            <div className="grid grid-cols-2 gap-3">
              <Field id="hotelMinPrice" label="Eng kam">
                <Input
                  id="hotelMinPrice"
                  inputMode="numeric"
                  value={minText}
                  onChange={(event) => setMinText(event.target.value)}
                  placeholder="0"
                  hasError={rangeError !== null}
                />
              </Field>

              <Field id="hotelMaxPrice" label="Eng ko&apos;p">
                <Input
                  id="hotelMaxPrice"
                  inputMode="numeric"
                  value={maxText}
                  onChange={(event) => setMaxText(event.target.value)}
                  placeholder="1 000 000"
                  hasError={rangeError !== null}
                />
              </Field>
            </div>

            {rangeError && (
              <Alert variant="warning" className="mt-2">
                {rangeError}
              </Alert>
            )}

            {/*
              Narx BITTA xonaga tegishli ekani aytiladi: aks holda
              odam "700 minggacha" deb qo'yib, keyin mehmonxona
              ichidan 2 millionlik lyuksni ko'rib hayron bo'lardi.
            */}
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Shu oraliqda kamida bitta xonasi bor mehmonxonalar ko&apos;rsatiladi.
            </p>
          </section>

          {/* ── Yulduz ── */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium">Yulduz</h3>

            <div className="flex flex-wrap gap-2">
              <FilterChip
                label="Farqi yo&apos;q"
                active={draft.minStars === undefined}
                onClick={() => setDraft({ ...draft, minStars: undefined })}
              />

              {STAR_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={draft.minStars === option.value}
                  onClick={() => setDraft({ ...draft, minStars: option.value })}
                />
              ))}
            </div>
          </section>

          {/* ── Qulayliklar ── */}
          <section>
            <h3 className="text-muted-foreground mb-2 text-xs font-medium">Qulayliklar</h3>

            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((amenity) => (
                <FilterChip
                  key={amenity}
                  label={amenity}
                  active={(draft.amenities ?? []).includes(amenity)}
                  onClick={() => toggleAmenity(amenity)}
                />
              ))}
            </div>

            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              Belgilanganlarning HAMMASI bor mehmonxonalar ko&apos;rsatiladi.
            </p>
          </section>
        </div>

        <div className="mt-6 flex gap-2">
          <Button variant="outline" fullWidth onClick={onClearAll}>
            Tozalash
          </Button>

          <Button fullWidth disabled={rangeError !== null} onClick={() => onApply(candidate)}>
            Ko&apos;rsatish
          </Button>
        </div>
      </div>
    </div>
  );
}

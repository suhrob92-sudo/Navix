'use client';

import { Clock, History } from 'lucide-react';
import Link from 'next/link';

import type { ChosenPlace } from '@/components/taxi/place-sheet';
import type { RideView } from '@/modules/taxi/taxi.types';

/**
 * Oxirgi borilgan manzillar.
 *
 * ── Nima uchun bu ro'yxat kerak ───────────────────────────────────────
 * Odam taksini har kuni deyarli BIR XIL joylarga chaqiradi: ishga,
 * uyga, bolasining maktabiga. Har safar xaritani surib, belgini
 * qaytadan qo'yish — o'sha ishni kuniga ikki marta takrorlash.
 *
 * Saqlangan manzillar buni to'liq yopmaydi: odam har borgan joyini
 * saqlab yurmaydi. Tarix esa o'zi to'planadi va hech narsa
 * so'ramaydi.
 *
 * ── Nima uchun manzil TAKRORLANMAYDI ──────────────────────────────────
 * Bir joyga o'n marta borilgan bo'lsa, ro'yxat o'sha manzilning
 * o'nta nusxasidan iborat bo'lardi va foydasi qolmasdi. Shuning
 * uchun nomi bo'yicha bir marta olinadi.
 */

/** Ro'yxatda nechta manzil ko'rsatiladi. */
const LIMIT = 4;

export interface RecentPlacesProps {
  rides: readonly RideView[];
  onPick: (place: ChosenPlace) => void;
}

/** Safarlar tarixidan TAKRORLANMAYDIGAN manzillar ro'yxati. */
export function recentDestinations(rides: readonly RideView[], limit = LIMIT): ChosenPlace[] {
  const seen = new Set<string>();
  const places: ChosenPlace[] = [];

  for (const ride of rides) {
    const key = ride.to.address.trim().toLowerCase();

    if (key.length === 0 || seen.has(key)) continue;

    seen.add(key);
    places.push({
      latitude: ride.to.latitude,
      longitude: ride.to.longitude,
      address: ride.to.address,
    });

    if (places.length >= limit) break;
  }

  return places;
}

export function RecentPlaces({ rides, onPick }: RecentPlacesProps) {
  const places = recentDestinations(rides);

  /*
    Tarix bo'sh bo'lsa, bo'limning O'ZI ko'rsatilmaydi.

    Bo'sh ro'yxat uchun "hali safar qilmagansiz" degan matn qo'yish
    mumkin edi, lekin u yangi foydalanuvchining ekranida keraksiz
    joy egallardi — u allaqachon nima qilishni biladi.
  */
  if (places.length === 0) return null;

  return (
    <section className="bg-card border-border overflow-hidden rounded-3xl border shadow-sm">
      <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
        <h2 className="text-sm font-semibold">Oxirgi manzillar</h2>

        {/*
          `tap-target` — bosiladigan maydon 44 pikselgacha
          kengayadi, matn esa o'sha o'lchamda qoladi.

          Havola 67x16 piksel edi: barmoq izi undan uch barobar
          katta va odam bosaman deb yonidagi sarlavhaga tegardi.
        */}
        <Link
          href="/taxi/tarix"
          className="tap-target text-primary flex items-center gap-1 text-xs font-medium"
        >
          <History className="size-3.5" aria-hidden="true" />
          Barchasi
        </Link>
      </div>

      <ul className="p-1.5">
        {places.map((place) => (
          <li key={place.address}>
            <button
              type="button"
              onClick={() => onPick(place)}
              className="hover:bg-secondary/60 flex w-full items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors"
            >
              <span className="bg-secondary text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
                <Clock className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{place.address}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

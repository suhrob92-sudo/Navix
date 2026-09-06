'use client';

import { Briefcase, House, Plus } from 'lucide-react';
import Link from 'next/link';

import type { ChosenPlace } from '@/components/taxi/place-sheet';

/**
 * "Uy" va "Ish" — bir bosishda manzil.
 *
 * ── Nima uchun alohida tugmalar kerak bo'ldi ──────────────────────────
 * Saqlangan manzillar tanlash oynasida ham bor. Lekin u yerga borish
 * uchun uchta harakat kerak: "Qayerga" ni bosish → oyna ochilishini
 * kutish → ro'yxatdan tanlash.
 *
 * Odam esa taksining yarmidan ko'pini AYNAN ikkita joyga chaqiradi:
 * uyiga va ishiga. Ular uchun uchta harakat ko'p.
 *
 * ── Nima uchun FAQAT ikkitasi ─────────────────────────────────────────
 * Uchinchi tugma qo'shilsa (masalan "Sevimli"), qatordagi har bir
 * tugma torayadi va ularning ma'nosi yo'qoladi: ro'yxatdan farqi
 * qolmaydi. Ikkitasi esa keng va aniq.
 *
 * ── Nima uchun bu YANGI so'rov yubormaydi ─────────────────────────────
 * Manzillar `PlaceSheet` da ham so'raladi. Ikkinchi so'rov yubormaslik
 * uchun ro'yxat OTA-komponentdan keladi: u allaqachon bitta so'rov
 * bilan olingan.
 */

/** Manzil qatori — `/api/v1/addresses` javobidagi shakl. */
export interface QuickAddress {
  id: string;
  type: string;
  label: string;
  city: string;
  street: string;
  building: string | null;
  latitude: number;
  longitude: number;
}

export interface QuickPlacesProps {
  addresses: readonly QuickAddress[];
  onPick: (place: ChosenPlace) => void;
}

/** Manzilni bir qatorlik matnga aylantiradi. */
function addressText(row: QuickAddress): string {
  const parts = [row.street, row.building].filter(Boolean).join(', ');

  return parts ? `${row.label} — ${parts}` : row.label;
}

/**
 * Turi bo'yicha BIRINCHI manzilni topadi.
 *
 * Bir odamda ikkita "Uy" bo'lishi mumkin (masalan ota-onasiniki).
 * Bunday holatda birinchisi olinadi — ro'yxat standart manzil
 * birinchi bo'ladigan tartibda keladi.
 */
function findByType(addresses: readonly QuickAddress[], type: string): QuickAddress | null {
  return addresses.find((row) => row.type === type) ?? null;
}

export function QuickPlaces({ addresses, onPick }: QuickPlacesProps) {
  const home = findByType(addresses, 'HOME');
  const work = findByType(addresses, 'WORK');

  return (
    <div className="grid grid-cols-2 gap-2">
      <QuickCard
        icon={House}
        title="Uy"
        address={home}
        emptyHint="Manzil qo'shing"
        onPick={onPick}
      />
      <QuickCard
        icon={Briefcase}
        title="Ish"
        address={work}
        emptyHint="Manzil qo'shing"
        onPick={onPick}
      />
    </div>
  );
}

/**
 * Bitta tugma.
 *
 * ── Nima uchun manzil YO'Q bo'lsa ham ko'rinadi ───────────────────────
 * Tugmani yashirish mumkin edi, lekin o'shanda foydalanuvchi bunday
 * imkoniyat borligini umuman bilmasdi. Ko'rinib turgan, lekin bo'sh
 * tugma esa o'zi taklif qiladi: "Uy — manzil qo'shing".
 *
 * Bosilganda u manzillar sahifasiga olib boradi, ya'ni bo'sh tugma
 * ham foydali.
 */
function QuickCard({
  icon: Icon,
  title,
  address,
  emptyHint,
  onPick,
}: {
  icon: typeof House;
  title: string;
  address: QuickAddress | null;
  emptyHint: string;
  onPick: (place: ChosenPlace) => void;
}) {
  const shared =
    'bg-card border-border flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-left shadow-sm transition-colors';

  if (!address) {
    return (
      <Link href="/addresses" className={`${shared} hover:bg-secondary/50`}>
        <span className="bg-secondary text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
          <Plus className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="text-muted-foreground block truncate text-xs">{emptyHint}</span>
        </span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() =>
        onPick({
          latitude: address.latitude,
          longitude: address.longitude,
          address: addressText(address),
        })
      }
      className={`${shared} hover:bg-secondary/50`}
    >
      <span className="bg-primary/12 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-muted-foreground block truncate text-xs">Tez tanlash</span>
      </span>
    </button>
  );
}

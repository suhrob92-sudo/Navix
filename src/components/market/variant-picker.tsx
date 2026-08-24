'use client';

import { cn } from '@/lib/utils';
import {
  findVariant,
  sellableValueIds,
  type VariantsView,
  type VariantView,
} from '@/modules/product/product-variant.types';

/**
 * Variant tanlash: rang, o'lcham, xotira.
 *
 * ── Nima uchun tugmalar, ochiluvchi ro'yxat emas ──────────────────────
 * Ochiluvchi ro'yxat (`select`) joyni kam egallaydi, lekin
 * qiymatlarni KO'RSATMAYDI: odam ranglarni ko'rish uchun avval
 * ro'yxatni ochishi kerak.
 *
 * Tugmalar esa hammasini bir qarashda ko'rsatadi — "oq bormi?"
 * degan savolga javob darhol turadi.
 *
 * ── Nima uchun TUGAGAN variant yashirilmaydi ──────────────────────────
 * Uni ro'yxatdan olib tashlash mumkin edi va sahifa toza
 * ko'rinardi.
 *
 * Lekin unda xaridor "oq rangi bormidi?" degan savolga javob
 * ololmasdi — u shunchaki yo'q deb o'ylardi. O'chirilgan tugma esa
 * aniq aytadi: bor, lekin hozir tugagan.
 *
 * ── Nima uchun MUMKIN BO'LMAGAN birikma o'chiriladi ───────────────────
 * Sotuvchi "qora" va "oq" ranglarni, "128 GB" va "256 GB"
 * xotiralarni kiritgan bo'lishi mumkin, lekin "oq 128 GB" ni
 * umuman sotmasligi mumkin.
 *
 * Bunday birikmani tanlab bo'lsa, odam bo'sh holatga tushardi:
 * narx ham, tugma ham yo'q.
 */

export interface VariantPickerProps {
  data: VariantsView;
  /** Tanlangan qiymat ID'lari — tanlovlar tartibida. */
  selected: string[];
  onSelect: (optionIndex: number, valueId: string) => void;
  className?: string;
}

export function VariantPicker({ data, selected, onSelect, className }: VariantPickerProps) {
  if (data.options.length === 0) return null;

  /**
   * Sotuvda bo'lgan qiymatlar.
   *
   * Hisob boshqa tanlovlarga QARAMAYDI — sabab
   * `sellableValueIds` da: aks holda tanlovdan chiqib bo'lmasdi.
   */
  const sellable = sellableValueIds(data.variants);

  return (
    <div className={cn('space-y-4', className)}>
      {data.options.map((option, optionIndex) => {
        return (
          <div key={option.id}>
            <p className="text-muted-foreground mb-2 text-xs font-medium">{option.name}</p>

            <div className="flex flex-wrap gap-2">
              {option.values.map((value) => {
                const isSelected = selected.includes(value.id);

                /**
                 * Tugma FAQAT sotuvda yo'q bo'lsa o'chiriladi.
                 *
                 * Boshqa tanlovga bog'liq holda o'chirish odamni
                 * tuzoqqa tushirardi — sabab `sellableValueIds` da.
                 */
                const isDisabled = !sellable.has(value.id);

                return (
                  <button
                    key={value.id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={isDisabled}
                    onClick={() => onSelect(optionIndex, value.id)}
                    className={cn(
                      'rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card hover:border-primary/50',
                      /*
                        O'chirilgan tugma ustidan chiziladi: faqat
                        xiralashtirish yetarli emas — u "yuklanmoqda"
                        degan taassurot ham qoldirishi mumkin.
                      */
                      isDisabled && 'text-muted-foreground/60 line-through opacity-60',
                    )}
                  >
                    {value.value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Tanlangan variant — sahifa narx va zaxirani shundan oladi.
 *
 * Nomi `use` bilan boshlanmaydi: bu hook EMAS, oddiy funksiya.
 * `use` qo'yilsa, React qoidalari uni shartli chaqirishni
 * taqiqlab qo'yardi.
 */
export function selectedVariantOf(data: VariantsView, selected: string[]): VariantView | null {
  if (data.options.length === 0) return null;

  return findVariant(data.variants, selected);
}

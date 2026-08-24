'use client';

import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MAX_OPTIONS,
  MAX_VALUES_PER_OPTION,
  MAX_VARIANTS,
  OPTION_NAME_MAX_LENGTH,
  variantLabel,
} from '@/config/product-variant';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { VariantsView } from '@/modules/product/product-variant.types';

/**
 * Variantlarni tahrirlash — sotuvchi kabineti uchun.
 *
 * ── Nima uchun BIRIKMALAR avtomatik yasaladi ──────────────────────────
 * Sotuvchidan har bir birikmani qo'lda kiritishni so'rash mumkin
 * edi: "Qora 128", "Qora 256", "Oq 128", "Oq 256".
 *
 * Ikkita rang va ikkita xotirada bu to'rtta qator. Uchta rang va
 * to'rtta o'lchamda esa o'n ikkita — va sotuvchi ularning bittasini
 * albatta unutardi.
 *
 * Shuning uchun u faqat TANLOVLARNI yozadi, birikmalar esa o'zi
 * hosil bo'ladi. Keyin u faqat narx va zaxirani to'ldiradi.
 *
 * ── Nima uchun narx HAR BIRIDA alohida ────────────────────────────────
 * 256 GB li telefon 128 GB lidan qimmat. Bitta narx qo'yilsa,
 * sotuvchi qimmatrog'ini arzon sotib, zarar ko'rardi.
 */

interface EditorRow {
  /** Birikma qiymatlari — tanlovlar tartibida. */
  values: string[];
  priceSom: string;
  oldPriceSom: string;
  stock: string;
  isActive: boolean;
}

export interface VariantEditorProps {
  productId: string;
  data: VariantsView;
  /** Mahsulotning o'z narxi — yangi birikmalar uchun boshlang'ich qiymat. */
  defaultPriceSom: number;
  onSaved: (data: VariantsView) => void;
  className?: string;
}

/** Vergul bilan yozilgan qiymatlarni ajratadi. */
function splitValues(raw: string): string[] {
  return [...new Set(raw.split(',').map((value) => value.trim()).filter(Boolean))];
}

/** Tiyindagi summani so'mga. */
function toSom(tiyin: number): string {
  return String(Math.round(tiyin / 100));
}

export function VariantEditor({
  productId,
  data,
  defaultPriceSom,
  onSaved,
  className,
}: VariantEditorProps) {
  const request = useApiClient();

  const [optionNames, setOptionNames] = useState<string[]>(() =>
    Array.from({ length: MAX_OPTIONS }, (_, index) => data.options[index]?.name ?? ''),
  );

  const [optionValues, setOptionValues] = useState<string[]>(() =>
    Array.from({ length: MAX_OPTIONS }, (_, index) =>
      (data.options[index]?.values ?? []).map((value) => value.value).join(', '),
    ),
  );

  const [rows, setRows] = useState<EditorRow[]>(() => {
    const valueById = new Map(
      data.options.flatMap((option) => option.values.map((value) => [value.id, value.value])),
    );

    return data.variants.map((variant) => ({
      values: variant.optionValueIds.map((id) => valueById.get(id) ?? ''),
      priceSom: toSom(variant.price),
      oldPriceSom: variant.oldPrice === null ? '' : toSom(variant.oldPrice),
      stock: String(variant.stock),
      isActive: variant.isActive,
    }));
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  /** To'ldirilgan tanlovlar. */
  const filledOptions = optionNames
    .map((name, index) => ({ name: name.trim(), values: splitValues(optionValues[index] ?? '') }))
    .filter((option) => option.name.length > 0 && option.values.length > 0);

  /**
   * Birikmalarni yasaydi.
   *
   * Mavjud qatorlarning narxi va zaxirasi SAQLANADI: sotuvchi
   * yangi rang qo'shganda eski ma'lumotni qaytadan yozmasligi
   * kerak.
   */
  function generate() {
    setError(null);

    if (filledOptions.length === 0) {
      setRows([]);

      return;
    }

    const combos: string[][] = [[]];

    for (const option of filledOptions) {
      const next: string[][] = [];

      for (const combo of combos) {
        for (const value of option.values) {
          next.push([...combo, value]);
        }
      }

      combos.length = 0;
      combos.push(...next);
    }

    if (combos.length > MAX_VARIANTS) {
      setError(
        `${combos.length} ta birikma hosil bo'ldi. Chegara — ${MAX_VARIANTS} ta. Qiymatlarni kamaytiring.`,
      );

      return;
    }

    const previous = new Map(rows.map((row) => [row.values.join(' '), row]));

    setRows(
      combos.map((values) => {
        const existing = previous.get(values.join(' '));

        return (
          existing ?? {
            values,
            priceSom: String(defaultPriceSom),
            oldPriceSom: '',
            stock: '0',
            isActive: true,
          }
        );
      }),
    );
    setSavedAt(null);
  }

  function updateRow(index: number, patch: Partial<EditorRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setSavedAt(null);
  }

  async function save() {
    setError(null);
    setIsSaving(true);

    try {
      const result = await request<VariantsView>(`/api/v1/products/${productId}/variants`, {
        method: 'PUT',
        body: {
          options: filledOptions,
          variants: rows.map((row) => ({
            values: row.values,
            priceSom: Number(row.priceSom) || 0,
            oldPriceSom: row.oldPriceSom.trim() === '' ? null : Number(row.oldPriceSom),
            stock: Number(row.stock) || 0,
            isActive: row.isActive,
          })),
        },
      });

      onSaved(result);
      setSavedAt(Date.now());
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  async function removeAll() {
    setError(null);
    setIsSaving(true);

    try {
      const result = await request<VariantsView>(`/api/v1/products/${productId}/variants`, {
        method: 'PUT',
        body: { options: [], variants: [] },
      });

      setOptionNames(Array.from({ length: MAX_OPTIONS }, () => ''));
      setOptionValues(Array.from({ length: MAX_OPTIONS }, () => ''));
      setRows([]);
      onSaved(result);
      setSavedAt(Date.now());
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Variantlar</p>
        <p className="text-muted-foreground text-xs tabular-nums">
          {`${rows.length}/${MAX_VARIANTS}`}
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <p className="text-muted-foreground text-xs">
        Rang, o&apos;lcham, xotira — eng ko&apos;pi {MAX_OPTIONS} ta tanlov. Qiymatlarni vergul
        bilan ajrating.
      </p>

      {Array.from({ length: MAX_OPTIONS }, (_, index) => (
        <div key={index} className="flex items-start gap-2">
          <Input
            value={optionNames[index] ?? ''}
            onChange={(event) => {
              const next = [...optionNames];

              next[index] = event.target.value;
              setOptionNames(next);
            }}
            maxLength={OPTION_NAME_MAX_LENGTH}
            placeholder={index === 0 ? 'Rang' : 'Xotira'}
            aria-label={`${index + 1}-tanlov nomi`}
            disabled={isSaving}
            className="w-28 shrink-0"
          />

          <Input
            value={optionValues[index] ?? ''}
            onChange={(event) => {
              const next = [...optionValues];

              next[index] = event.target.value;
              setOptionValues(next);
            }}
            placeholder={index === 0 ? 'Qora, Oq, Kok' : '128 GB, 256 GB'}
            aria-label={`${index + 1}-tanlov qiymatlari`}
            disabled={isSaving}
            className="min-w-0 flex-1"
          />
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={generate} disabled={isSaving}>
          <Sparkles className="size-4" aria-hidden="true" />
          Birikmalarni yasash
        </Button>

        {(rows.length > 0 || data.options.length > 0) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void removeAll()}
            disabled={isSaving}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Variantsiz qilish
          </Button>
        )}
      </div>

      {rows.length > 0 && (
        <>
          <p className="text-muted-foreground text-xs">
            Har bir birikmaga narx va zaxira yozing. Zaxirasi 0 bo&apos;lgani xaridorga
            &laquo;tugagan&raquo; deb ko&apos;rinadi.
          </p>

          <ul className="space-y-2">
            {rows.map((row, index) => (
              <li key={row.values.join(' ')} className="border-border/60 rounded-xl border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">
                    {variantLabel(row.values)}
                  </p>

                  <label className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={row.isActive}
                      onChange={(event) => updateRow(index, { isActive: event.target.checked })}
                      disabled={isSaving}
                      className="size-4"
                    />
                    Sotuvda
                  </label>
                </div>

                <div className="mt-2 flex items-start gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={row.priceSom}
                    onChange={(event) => updateRow(index, { priceSom: event.target.value })}
                    placeholder="Narx"
                    aria-label={`${variantLabel(row.values)} — narx`}
                    disabled={isSaving}
                    className="min-w-0 flex-1"
                  />

                  <Input
                    type="number"
                    inputMode="numeric"
                    value={row.stock}
                    onChange={(event) => updateRow(index, { stock: event.target.value })}
                    placeholder="Zaxira"
                    aria-label={`${variantLabel(row.values)} — zaxira`}
                    disabled={isSaving}
                    className="w-24 shrink-0"
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={() => void save()} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            'Variantlarni saqlash'
          )}
        </Button>

        {savedAt !== null && !isSaving && (
          <span className="text-muted-foreground text-xs">Saqlandi</span>
        )}

        <span className="text-muted-foreground text-xs">
          {`Bitta tanlovda eng ko'pi ${MAX_VALUES_PER_OPTION} ta qiymat`}
        </span>
      </div>
    </div>
  );
}

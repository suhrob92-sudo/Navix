'use client';

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ATTRIBUTE_NAME_MAX_LENGTH,
  ATTRIBUTE_VALUE_MAX_LENGTH,
  MAX_PRODUCT_ATTRIBUTES,
} from '@/config/product-detail';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';

/**
 * Xususiyatlarni tahrirlash — sotuvchi kabineti uchun.
 *
 * ── Nima uchun "Saqlash" tugmasi ALOHIDA ──────────────────────────────
 * Rasmlar boshqacha ishlaydi: har bir rasm qo'shilishi bilan
 * serverga yoziladi, chunki fayl allaqachon yuklangan.
 *
 * Xususiyatlar esa MATN: sotuvchi ularni jadval ko'rinishida,
 * birdaniga tahrirlaydi — uchtasini o'zgartirib, bittasini
 * o'chirib, ikkitasini qo'shadi.
 *
 * Har bir harfda so'rov ketsa, bu o'nlab so'rov bo'lardi. Bir
 * marta saqlash esa aniq va tushunarli.
 */

export interface AttributeRow {
  id: string;
  name: string;
  value: string;
}

export interface AttributeEditorProps {
  productId: string;
  attributes: AttributeRow[];
  onSaved: (attributes: AttributeRow[]) => void;
  className?: string;
}

/** Yangi qator uchun vaqtinchalik kalit. */
let nextKey = 0;

export function AttributeEditor({
  productId,
  attributes,
  onSaved,
  className,
}: AttributeEditorProps) {
  const request = useApiClient();

  const [rows, setRows] = useState<AttributeRow[]>(attributes);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const isFull = rows.length >= MAX_PRODUCT_ATTRIBUTES;

  function update(index: number, patch: Partial<AttributeRow>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setSavedAt(null);
  }

  function addRow() {
    nextKey += 1;
    setRows((current) => [...current, { id: `yangi-${nextKey}`, name: '', value: '' }]);
    setSavedAt(null);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
    setSavedAt(null);
  }

  async function save() {
    setError(null);

    /**
     * BO'SH qatorlar jimgina tashlab yuboriladi.
     *
     * Sotuvchi "qo'shish" tugmasini bosib, keyin fikridan qaytishi
     * odatiy holat. Bunga xato ko'rsatish faqat xalaqit berardi.
     */
    const cleaned = rows
      .map((row) => ({ name: row.name.trim(), value: row.value.trim() }))
      .filter((row) => row.name.length > 0 && row.value.length > 0);

    setIsSaving(true);

    try {
      const result = await request<{ attributes: AttributeRow[] }>(
        `/api/v1/products/${productId}/attributes`,
        { method: 'PUT', body: { attributes: cleaned } },
      );

      setRows(result.attributes);
      onSaved(result.attributes);
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
        <p className="text-sm font-medium">Xususiyatlar</p>
        <p className="text-muted-foreground text-xs tabular-nums">
          {`${rows.length}/${MAX_PRODUCT_ATTRIBUTES}`}
        </p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {rows.length === 0 && (
        <p className="text-muted-foreground text-xs">
          Ekran, xotira, rang — xaridor eng ko&apos;p shularni so&apos;raydi.
        </p>
      )}

      <div className="space-y-2">
        {rows.map((row, index) => (
          <div key={row.id} className="flex items-start gap-2">
            <Input
              value={row.name}
              onChange={(event) => update(index, { name: event.target.value })}
              maxLength={ATTRIBUTE_NAME_MAX_LENGTH}
              placeholder="Ekran"
              aria-label={`${index + 1}-xususiyat nomi`}
              disabled={isSaving}
              className="w-32 shrink-0"
            />

            <Input
              value={row.value}
              onChange={(event) => update(index, { value: event.target.value })}
              maxLength={ATTRIBUTE_VALUE_MAX_LENGTH}
              placeholder="6.6 dyuym AMOLED"
              aria-label={`${index + 1}-xususiyat qiymati`}
              disabled={isSaving}
              className="min-w-0 flex-1"
            />

            <button
              type="button"
              aria-label={`${index + 1}-xususiyatni o'chirish`}
              onClick={() => removeRow(index)}
              disabled={isSaving}
              className="text-muted-foreground hover:text-destructive mt-3 inline-flex size-6 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={isSaving || isFull}>
          <Plus className="size-4" aria-hidden="true" />
          Qator
        </Button>

        <Button type="button" size="sm" onClick={() => void save()} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            'Xususiyatlarni saqlash'
          )}
        </Button>

        {savedAt !== null && !isSaving && (
          <span className="text-muted-foreground text-xs">Saqlandi</span>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useApiClient } from '@/hooks/use-api';
import { ApiClientError, toUserMessage } from '@/lib/api-client';
import type { FieldErrors } from '@/lib/api/errors';
import type { SellerShop } from '@/modules/seller/seller.types';

/**
 * Do'kon sozlamalari — EGASI o'zgartiradi.
 *
 * ── Nima uchun bu ekran kerak bo'ldi ──────────────────────────────────
 * Ilgari sotuvchi kabinetdan faqat "ochiq/yopiq" tugmasini bosa
 * olardi. Nomi noto'g'ri yozilgan yoki yetkazish narxi o'zgargan
 * bo'lsa, u platformaga murojaat qilishi kerak edi.
 *
 * ── Nima uchun manzil (`slug`) o'zgarmaydi ────────────────────────────
 * Manzil havolada turadi: ijtimoiy tarmoqdagi postda, mijozning
 * saqlagan sahifasida. Nom o'zgarganda manzil ham o'zgarsa, o'sha
 * havolalar ochilmay qolardi. Shuning uchun nom o'zgaradi, manzil
 * qoladi.
 *
 * ── Nima uchun summalar SO'MDA ────────────────────────────────────────
 * Bazada pul tiyinda saqlanadi, lekin odam so'mda o'ylaydi. Tiyinni
 * ekranga chiqarish "5000" ni "500000" ga aylantiradi va sotuvchi
 * yetkazish narxini yuz barobar xato kiritishi mumkin edi.
 */

/** Tiyindan so'mga — faqat ko'rsatish uchun. */
function toSom(tiyin: number): number {
  return Math.round(tiyin / 100);
}

interface FormState {
  name: string;
  description: string;
  deliveryFeeSom: string;
  minOrderSom: string;
  deliveryDays: string;
}

function initialState(shop: SellerShop): FormState {
  return {
    name: shop.name,
    description: shop.description,
    deliveryFeeSom: String(toSom(shop.deliveryFee)),
    minOrderSom: String(toSom(shop.minOrder)),
    deliveryDays: String(shop.deliveryDays),
  };
}

export interface ShopSettingsFormProps {
  shop: SellerShop;
  /** Saqlangandan keyin ro'yxat yangilanadi. */
  onSaved: () => void;
}

export function ShopSettingsForm({ shop, onSaved }: ShopSettingsFormProps) {
  const request = useApiClient();

  const [form, setForm] = useState<FormState>(() => initialState(shop));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  function update<Key extends keyof FormState>(key: Key, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setIsSaved(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setFormError(null);
    setIsSaving(true);

    try {
      await request(`/api/v1/seller/shops/${shop.id}`, {
        method: 'PATCH',
        body: {
          name: form.name.trim(),
          description: form.description.trim(),
          deliveryFeeSom: Number(form.deliveryFeeSom),
          minOrderSom: Number(form.minOrderSom),
          deliveryDays: Number(form.deliveryDays),
        },
      });

      setIsSaved(true);
      onSaved();
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.details) {
        setFieldErrors(caught.details);
      } else {
        setFormError(toUserMessage(caught));
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {formError && <Alert variant="error">{formError}</Alert>}

      {isSaved && !formError && (
        <Alert variant="success">Saqlandi. O&apos;zgarish katalogda darhol ko&apos;rinadi.</Alert>
      )}

      <Field id={`shop-name-${shop.id}`} label="Nomi" required errors={fieldErrors.name}>
        <Input
          id={`shop-name-${shop.id}`}
          value={form.name}
          onChange={(event) => update('name', event.target.value)}
          hasError={Boolean(fieldErrors.name)}
          disabled={isSaving}
        />
      </Field>

      <Field
        id={`shop-description-${shop.id}`}
        label="Tavsif"
        hint="Xaridor do'kon sahifasida shuni o'qiydi"
        errors={fieldErrors.description}
      >
        <Textarea
          id={`shop-description-${shop.id}`}
          value={form.description}
          onChange={(event) => update('description', event.target.value)}
          rows={3}
          maxLength={255}
          disabled={isSaving}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field
          id={`shop-fee-${shop.id}`}
          label="Yetkazish narxi"
          hint="So'mda. 0 — bepul"
          errors={fieldErrors.deliveryFeeSom}
        >
          <Input
            id={`shop-fee-${shop.id}`}
            type="number"
            inputMode="numeric"
            min={0}
            value={form.deliveryFeeSom}
            onChange={(event) => update('deliveryFeeSom', event.target.value)}
            hasError={Boolean(fieldErrors.deliveryFeeSom)}
            disabled={isSaving}
          />
        </Field>

        <Field
          id={`shop-min-${shop.id}`}
          label="Minimal buyurtma"
          hint="So'mda. 0 — chegara yo'q"
          errors={fieldErrors.minOrderSom}
        >
          <Input
            id={`shop-min-${shop.id}`}
            type="number"
            inputMode="numeric"
            min={0}
            value={form.minOrderSom}
            onChange={(event) => update('minOrderSom', event.target.value)}
            hasError={Boolean(fieldErrors.minOrderSom)}
            disabled={isSaving}
          />
        </Field>
      </div>

      <Field
        id={`shop-days-${shop.id}`}
        label="Yetkazish muddati"
        hint="Necha kunda yetkaziladi"
        errors={fieldErrors.deliveryDays}
      >
        <Input
          id={`shop-days-${shop.id}`}
          type="number"
          inputMode="numeric"
          min={1}
          max={30}
          value={form.deliveryDays}
          onChange={(event) => update('deliveryDays', event.target.value)}
          hasError={Boolean(fieldErrors.deliveryDays)}
          disabled={isSaving}
        />
      </Field>

      <Button type="submit" size="sm" isLoading={isSaving}>
        Saqlash
      </Button>
    </form>
  );
}

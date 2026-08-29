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
import type { MerchantRestaurant } from '@/modules/merchant/merchant.types';

/**
 * Restoran sozlamalari — EGASI o'zgartiradi.
 *
 * ── Nima uchun bu ekran kerak bo'ldi ──────────────────────────────────
 * Ilgari restoran egasi kabinetdan faqat "ochiq/yopiq" tugmasini bosa
 * olardi. Yetkazish narxi o'zgarsa yoki nomda xato bo'lsa, u
 * platformaga murojaat qilishi kerak edi.
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
  deliveryMinutes: string;
}

function initialState(restaurant: MerchantRestaurant): FormState {
  return {
    name: restaurant.name,
    description: restaurant.description,
    deliveryFeeSom: String(toSom(restaurant.deliveryFee)),
    minOrderSom: String(toSom(restaurant.minOrder)),
    deliveryMinutes: String(restaurant.deliveryMinutes),
  };
}

export interface RestaurantSettingsFormProps {
  restaurant: MerchantRestaurant;
  /** Saqlangandan keyin ro'yxat yangilanadi. */
  onSaved: () => void;
}

export function RestaurantSettingsForm({ restaurant, onSaved }: RestaurantSettingsFormProps) {
  const request = useApiClient();

  const [form, setForm] = useState<FormState>(() => initialState(restaurant));
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
      await request(`/api/v1/merchant/restaurants/${restaurant.id}`, {
        method: 'PATCH',
        body: {
          name: form.name.trim(),
          description: form.description.trim(),
          deliveryFeeSom: Number(form.deliveryFeeSom),
          minOrderSom: Number(form.minOrderSom),
          deliveryMinutes: Number(form.deliveryMinutes),
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

      <Field id={`restaurant-name-${restaurant.id}`} label="Nomi" required errors={fieldErrors.name}>
        <Input
          id={`restaurant-name-${restaurant.id}`}
          value={form.name}
          onChange={(event) => update('name', event.target.value)}
          hasError={Boolean(fieldErrors.name)}
          disabled={isSaving}
        />
      </Field>

      <Field
        id={`restaurant-description-${restaurant.id}`}
        label="Tavsif"
        hint="Mijoz restoran sahifasida shuni o'qiydi"
        errors={fieldErrors.description}
      >
        <Textarea
          id={`restaurant-description-${restaurant.id}`}
          value={form.description}
          onChange={(event) => update('description', event.target.value)}
          rows={3}
          maxLength={255}
          disabled={isSaving}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field
          id={`restaurant-fee-${restaurant.id}`}
          label="Yetkazish narxi"
          hint="So'mda. 0 — bepul"
          errors={fieldErrors.deliveryFeeSom}
        >
          <Input
            id={`restaurant-fee-${restaurant.id}`}
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
          id={`restaurant-min-${restaurant.id}`}
          label="Minimal buyurtma"
          hint="So'mda. 0 — chegara yo'q"
          errors={fieldErrors.minOrderSom}
        >
          <Input
            id={`restaurant-min-${restaurant.id}`}
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
        id={`restaurant-minutes-${restaurant.id}`}
        label="Yetkazish vaqti"
        hint="Necha daqiqada yetkaziladi"
        errors={fieldErrors.deliveryMinutes}
      >
        <Input
          id={`restaurant-minutes-${restaurant.id}`}
          type="number"
          inputMode="numeric"
          min={10}
          max={180}
          value={form.deliveryMinutes}
          onChange={(event) => update('deliveryMinutes', event.target.value)}
          hasError={Boolean(fieldErrors.deliveryMinutes)}
          disabled={isSaving}
        />
      </Field>

      <Button type="submit" size="sm" isLoading={isSaving}>
        Saqlash
      </Button>
    </form>
  );
}

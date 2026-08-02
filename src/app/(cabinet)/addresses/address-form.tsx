'use client';

import { useState, type FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ApiClientError, toUserMessage } from '@/lib/api-client';
import { useApiClient } from '@/hooks/use-api';
import { ADDRESS_TYPE_OPTIONS, createAddressSchema } from '@/modules/address/address.schemas';
import type { FieldErrors } from '@/lib/api/errors';
import type { AddressItem } from '@/app/(cabinet)/addresses/addresses-content';

interface AddressFormProps {
  /** Tahrirlanayotgan manzil. `null` — yangi manzil qo'shilmoqda. */
  address: AddressItem | null;
  onSaved: (address: AddressItem) => void;
  onCancel: () => void;
}

/** Manzil qo'shish va tahrirlash formasi. */
export function AddressForm({ address, onSaved, onCancel }: AddressFormProps) {
  const request = useApiClient();
  const isEditing = address !== null;

  const [type, setType] = useState(address?.type ?? 'HOME');
  const [label, setLabel] = useState(address?.label ?? '');
  const [city, setCity] = useState(address?.city ?? 'Toshkent');
  const [district, setDistrict] = useState(address?.district ?? '');
  const [street, setStreet] = useState(address?.street ?? '');
  const [building, setBuilding] = useState(address?.building ?? '');
  const [apartment, setApartment] = useState(address?.apartment ?? '');
  const [latitude, setLatitude] = useState(address ? String(address.latitude) : '');
  const [longitude, setLongitude] = useState(address ? String(address.longitude) : '');
  const [notes, setNotes] = useState(address?.notes ?? '');
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  /** Brauzerdan joriy joylashuvni oladi. */
  function fillCurrentLocation() {
    if (!('geolocation' in navigator)) {
      setFormError("Brauzeringiz joylashuvni aniqlashni qo'llab-quvvatlamaydi");
      return;
    }

    setIsLocating(true);
    setFormError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7));
        setLongitude(position.coords.longitude.toFixed(7));
        setIsLocating(false);
      },
      () => {
        setFormError("Joylashuvni aniqlab bo'lmadi. Koordinatalarni qo'lda kiriting.");
        setIsLocating(false);
      },
      { timeout: 10_000, enableHighAccuracy: true },
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = createAddressSchema.safeParse({
      type,
      label,
      city,
      district: district.trim() || null,
      street,
      building: building.trim() || null,
      apartment: apartment.trim() || null,
      latitude,
      longitude,
      notes: notes.trim() || null,
      isDefault,
    });

    if (!parsed.success) {
      const errors: FieldErrors = {};

      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || '_root';
        errors[key] = [...(errors[key] ?? []), issue.message];
      }

      setFieldErrors(errors);
      return;
    }

    setIsSaving(true);

    try {
      const saved = await request<AddressItem>(
        isEditing ? `/api/v1/addresses/${address.id}` : '/api/v1/addresses',
        { method: isEditing ? 'PATCH' : 'POST', body: parsed.data },
      );

      onSaved(saved);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.details) {
        setFieldErrors(caught.details);
      }

      setFormError(toUserMessage(caught));
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="type" label="Manzil turi" required errors={fieldErrors.type}>
          <Select
            id="type"
            options={ADDRESS_TYPE_OPTIONS}
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
            disabled={isSaving}
          />
        </Field>

        <Field id="label" label="Nomi" required hint="Masalan: Uyim, Ofis" errors={fieldErrors.label}>
          <Input
            id="label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Uyim"
            hasError={Boolean(fieldErrors.label)}
            disabled={isSaving}
          />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="city" label="Shahar" required errors={fieldErrors.city}>
          <Input
            id="city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            hasError={Boolean(fieldErrors.city)}
            disabled={isSaving}
          />
        </Field>

        <Field id="district" label="Tuman" errors={fieldErrors.district}>
          <Input
            id="district"
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            placeholder="Chilonzor"
            hasError={Boolean(fieldErrors.district)}
            disabled={isSaving}
          />
        </Field>
      </div>

      <Field id="street" label="Ko'cha" required errors={fieldErrors.street}>
        <Input
          id="street"
          value={street}
          onChange={(event) => setStreet(event.target.value)}
          placeholder="Bunyodkor shoh ko'chasi"
          hasError={Boolean(fieldErrors.street)}
          disabled={isSaving}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="building" label="Uy raqami" errors={fieldErrors.building}>
          <Input
            id="building"
            value={building}
            onChange={(event) => setBuilding(event.target.value)}
            placeholder="12A"
            hasError={Boolean(fieldErrors.building)}
            disabled={isSaving}
          />
        </Field>

        <Field id="apartment" label="Xonadon" errors={fieldErrors.apartment}>
          <Input
            id="apartment"
            value={apartment}
            onChange={(event) => setApartment(event.target.value)}
            placeholder="45"
            hasError={Boolean(fieldErrors.apartment)}
            disabled={isSaving}
          />
        </Field>
      </div>

      {/* Koordinatalar — taksi va kuryer uchun majburiy */}
      <div className="border-border/60 space-y-4 rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Koordinatalar</p>
            <p className="text-muted-foreground text-xs">Haydovchi va kuryer aniq joyni topishi uchun</p>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={fillCurrentLocation} isLoading={isLocating}>
            Joriy joylashuvim
          </Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="latitude" label="Kenglik (latitude)" required errors={fieldErrors.latitude}>
            <Input
              id="latitude"
              inputMode="decimal"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              placeholder="41.2995"
              hasError={Boolean(fieldErrors.latitude)}
              disabled={isSaving}
            />
          </Field>

          <Field id="longitude" label="Uzunlik (longitude)" required errors={fieldErrors.longitude}>
            <Input
              id="longitude"
              inputMode="decimal"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              placeholder="69.2401"
              hasError={Boolean(fieldErrors.longitude)}
              disabled={isSaving}
            />
          </Field>
        </div>
      </div>

      <Field id="notes" label="Qo'shimcha izoh" hint="Domofon kodi, mo'ljal va hokazo" errors={fieldErrors.notes}>
        <Input
          id="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="2-podyezd, domofon 45"
          hasError={Boolean(fieldErrors.notes)}
          disabled={isSaving}
        />
      </Field>

      <div className="border-border/60 border-t pt-5">
        <Switch
          checked={isDefault}
          onCheckedChange={setIsDefault}
          disabled={isSaving}
          label="Standart manzil"
          description="Buyurtma berishda avtomatik tanlanadi"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Bekor qilish
        </Button>
        <Button type="submit" isLoading={isSaving} loadingText="Saqlanmoqda...">
          {isEditing ? "O'zgarishlarni saqlash" : "Manzilni qo'shish"}
        </Button>
      </div>
    </form>
  );
}

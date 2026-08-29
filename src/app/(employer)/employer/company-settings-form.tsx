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
import type { EmployerCompany } from '@/modules/employer/employer.types';

/**
 * Kompaniya ma'lumoti — EGASI o'zgartiradi.
 *
 * ── Nima uchun bu ekran kerak bo'ldi ──────────────────────────────────
 * Nomzod e'londa kompaniya nomini, sohasini va tavsifini ko'radi —
 * ko'pincha aynan shu matnga qarab ariza yuboradi.
 *
 * Ilgari ularni faqat platforma o'zgartira olardi: ish beruvchi
 * kabinetida vakansiyalar va arizalar bor edi, kompaniyaning o'zi esa
 * yo'q edi.
 *
 * ── Nima uchun manzil (`slug`) o'zgarmaydi ────────────────────────────
 * Manzil e'londa va tashqi havolalarda turadi. Nom o'zgarganda manzil
 * ham o'zgarsa, eski havolalar ochilmay qolardi.
 */

interface FormState {
  name: string;
  description: string;
  industry: string;
  city: string;
}

function initialState(company: EmployerCompany): FormState {
  return {
    name: company.name,
    description: company.description,
    industry: company.industry,
    city: company.city,
  };
}

export interface CompanySettingsFormProps {
  company: EmployerCompany;
  /** Saqlangandan keyin ro'yxat yangilanadi. */
  onSaved: () => void;
}

export function CompanySettingsForm({ company, onSaved }: CompanySettingsFormProps) {
  const request = useApiClient();

  const [form, setForm] = useState<FormState>(() => initialState(company));
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
      await request(`/api/v1/employer/companies/${company.id}`, {
        method: 'PATCH',
        body: {
          name: form.name.trim(),
          description: form.description.trim(),
          industry: form.industry.trim(),
          city: form.city.trim(),
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
        <Alert variant="success">Saqlandi. O&apos;zgarish e&apos;lonlarda darhol ko&apos;rinadi.</Alert>
      )}

      <Field id={`company-name-${company.id}`} label="Nomi" required errors={fieldErrors.name}>
        <Input
          id={`company-name-${company.id}`}
          value={form.name}
          onChange={(event) => update('name', event.target.value)}
          hasError={Boolean(fieldErrors.name)}
          disabled={isSaving}
        />
      </Field>

      <Field
        id={`company-description-${company.id}`}
        label="Kompaniya haqida"
        hint="Nomzod e'londa shuni o'qiydi"
        required
        errors={fieldErrors.description}
      >
        <Textarea
          id={`company-description-${company.id}`}
          value={form.description}
          onChange={(event) => update('description', event.target.value)}
          rows={4}
          maxLength={400}
          disabled={isSaving}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field id={`company-industry-${company.id}`} label="Soha" errors={fieldErrors.industry}>
          <Input
            id={`company-industry-${company.id}`}
            value={form.industry}
            onChange={(event) => update('industry', event.target.value)}
            placeholder="Masalan: IT"
            hasError={Boolean(fieldErrors.industry)}
            disabled={isSaving}
          />
        </Field>

        <Field id={`company-city-${company.id}`} label="Shahar" errors={fieldErrors.city}>
          <Input
            id={`company-city-${company.id}`}
            value={form.city}
            onChange={(event) => update('city', event.target.value)}
            placeholder="Masalan: Toshkent"
            hasError={Boolean(fieldErrors.city)}
            disabled={isSaving}
          />
        </Field>
      </div>

      <Button type="submit" size="sm" isLoading={isSaving}>
        Saqlash
      </Button>
    </form>
  );
}

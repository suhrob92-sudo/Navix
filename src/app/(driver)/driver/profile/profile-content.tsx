'use client';

import { Car, Save } from 'lucide-react';
import { useCallback, useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { TAXI_TARIFF_LIST } from '@/config/taxi';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { ApiClientError, toUserMessage } from '@/lib/api-client';
import type { FieldErrors } from '@/lib/api/errors';
import type { DriverProfileResponse } from '@/modules/taxi/taxi.types';

const TARIFF_OPTIONS = TAXI_TARIFF_LIST.map((tariff) => ({
  value: tariff.name,
  label: `${tariff.label} — ${tariff.description}`,
}));

/**
 * Mashina ma'lumotlari.
 *
 * ── Nima uchun bu ma'lumot MAJBURIY ───────────────────────────────────
 * Mijoz ko'chada turib mashinani TANIShI kerak. Nomsiz "haydovchi
 * kelmoqda" degan xabar unga hech narsa bermaydi: qaysi mashinaga
 * qo'l ko'tarishni bilmaydi.
 *
 * Shuning uchun rusum, rang va davlat raqami — uchalasi ham
 * to'ldirilmasa, kabinet ochilmaydi.
 */
export function DriverProfileContent() {
  const request = useApiClient();
  const query = useApiQuery<DriverProfileResponse>('/api/v1/taxi/driver');

  const driver = query.data?.driver ?? null;

  const [carModel, setCarModel] = useState<string | null>(null);
  const [carColor, setCarColor] = useState<string | null>(null);
  const [plateNumber, setPlateNumber] = useState<string | null>(null);
  const [tariff, setTariff] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /*
    Maydonlar `null` dan boshlanadi va SERVER qiymati zaxira bo'ladi.

    Boshlang'ich qiymatni effektda yozish mumkin edi, lekin o'shanda
    yuklanish tugagach foydalanuvchi yozgan matn ustidan server
    qiymati yozilib ketishi mumkin — sekin tarmoqda bu haqiqiy
    holat.
  */
  const modelValue = carModel ?? driver?.carModel ?? '';
  const colorValue = carColor ?? driver?.carColor ?? '';
  const plateValue = plateNumber ?? driver?.plateNumber ?? '';
  const tariffValue = tariff ?? driver?.tariff ?? 'ECONOM';

  const save = useCallback(async () => {
    setIsSaving(true);
    setFormError(null);
    setFieldErrors({});
    setSaved(false);

    try {
      const result = await request<DriverProfileResponse>('/api/v1/taxi/driver', {
        method: 'PUT',
        body: {
          carModel: modelValue,
          carColor: colorValue,
          plateNumber: plateValue,
          tariff: tariffValue,
        },
      });

      query.setData(result);
      setSaved(true);

      /*
        Tahrirlangan qiymatlar TOZALANADI: shundan keyin ekran
        serverdagi (tozalangan) qiymatni ko'rsatadi. Masalan
        "01 a 777 aa" saqlangach "01A777AA" bo'lib qaytadi va
        foydalanuvchi buni ko'rishi kerak.
      */
      setCarModel(null);
      setCarColor(null);
      setPlateNumber(null);
      setTariff(null);
    } catch (error) {
      if (error instanceof ApiClientError && error.details) {
        setFieldErrors(error.details);
      }

      setFormError(toUserMessage(error));
    } finally {
      setIsSaving(false);
    }
  }, [colorValue, modelValue, plateValue, query, request, tariffValue]);

  return (
    <>
      <AdminHeader title="Mashinam" />

      <div className="space-y-4 px-4 pt-4 pb-6">
        {query.isLoading ? (
          <Skeleton className="h-72 rounded-3xl" />
        ) : (
          <section className="bg-card border-border space-y-4 rounded-3xl border p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="bg-primary/12 text-primary flex size-11 shrink-0 items-center justify-center rounded-2xl">
                <Car className="size-5" aria-hidden="true" />
              </span>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Mijoz ko&apos;chada turib mashinangizni shu ma&apos;lumot bo&apos;yicha taniydi.
              </p>
            </div>

            <Field id="carModel" label="Mashina rusumi" errors={fieldErrors.carModel} required>
              <Input
                id="carModel"
                value={modelValue}
                onChange={(event) => setCarModel(event.target.value)}
                placeholder="Masalan: Cobalt"
                autoComplete="off"
              />
            </Field>

            <Field id="carColor" label="Rangi" errors={fieldErrors.carColor} required>
              <Input
                id="carColor"
                value={colorValue}
                onChange={(event) => setCarColor(event.target.value)}
                placeholder="Masalan: oq"
                autoComplete="off"
              />
            </Field>

            <Field
              id="plateNumber"
              label="Davlat raqami"
              errors={fieldErrors.plateNumber}
              hint="Bo'shliqsiz yoziladi: 01A777AA"
              required
            >
              <Input
                id="plateNumber"
                value={plateValue}
                onChange={(event) => setPlateNumber(event.target.value)}
                placeholder="01A777AA"
                autoComplete="off"
                className="font-mono tracking-wider uppercase"
              />
            </Field>

            <Field
              id="tariff"
              label="Tarif"
              errors={fieldErrors.tariff}
              hint="Faqat shu tarifdagi buyurtmalar sizga ko'rinadi"
              required
            >
              <Select
                id="tariff"
                value={tariffValue}
                onChange={(event) => setTariff(event.target.value)}
                options={TARIFF_OPTIONS}
              />
            </Field>
          </section>
        )}

        {formError && <Alert variant="error">{formError}</Alert>}

        {saved && <Alert variant="success">Saqlandi.</Alert>}

        <Button fullWidth size="lg" onClick={save} isLoading={isSaving} disabled={query.isLoading}>
          <Save className="size-5" aria-hidden="true" />
          Saqlash
        </Button>
      </div>
    </>
  );
}

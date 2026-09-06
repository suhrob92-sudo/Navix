'use client';

import { ArrowRight, Car, ChevronRight, Clock, History } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { RideMap } from '@/components/map/ride-map';
import { PlaceField } from '@/components/taxi/place-field';
import { DEFAULT_CENTER, PlaceSheet, type ChosenPlace } from '@/components/taxi/place-sheet';
import { QuickPlaces, type QuickAddress } from '@/components/taxi/quick-places';
import { RecentPlaces } from '@/components/taxi/recent-places';
import { TariffOption } from '@/components/taxi/tariff-option';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatDistance } from '@/config/delivery-eta';
import type { TaxiTariffName } from '@/config/taxi';
import { isRideActive } from '@/modules/taxi/taxi.types';
import type {
  RideResponse,
  RidesResponse,
  TaxiQuoteResponse,
} from '@/modules/taxi/taxi.types';

/**
 * Taksi chaqirish ekrani.
 *
 * ── Ekran nima uchun shu tartibda ─────────────────────────────────────
 * Yuqorida — manzillar, o'rtada — xarita, pastda — tarif va tugma.
 *
 * Bu tartib ODAMNING savollar tartibi bilan bir xil: "qayerdan
 * qayerga?" → "yo'l qanaqa?" → "qancha turadi?" → "chaqiraman".
 * Tarifni yuqoriga qo'ysak, odam hali qayerga borishini
 * aytmasdan narxni ko'rardi va u narx hech narsani anglatmasdi.
 *
 * ── Nima uchun FAOL safar tekshiriladi ────────────────────────────────
 * Server bir vaqtda bitta safarga ruxsat beradi. Buni ekran ham
 * bilishi kerak: aks holda odam butun formani to'ldirib, oxirida
 * "sizda tugallanmagan safar bor" degan xatoni ko'rardi.
 *
 * Faol safar bo'lsa, ekran uni KUZATISH sahifasiga olib o'tadi.
 */
export function TaxiContent() {
  const router = useRouter();
  const request = useApiClient();

  const [from, setFrom] = useState<ChosenPlace | null>(null);
  const [to, setTo] = useState<ChosenPlace | null>(null);
  const [sheet, setSheet] = useState<'from' | 'to' | null>(null);
  const [tariff, setTariff] = useState<TaxiTariffName>('ECONOM');

  const [formError, setFormError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  /**
   * Idempotentlik kaliti ekran ochilganda yaratiladi.
   *
   * Har bosishda yangisi yasalsa, ikki marta bosilgan tugma ikkita
   * safar va ikkita to'lov yasardi.
   */
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  /*
    Safarlar ro'yxati BIR MARTA so'raladi va IKKI ishga xizmat qiladi:
    faol safar bormi va oxirgi manzillar qaysi.

    Ikkita alohida so'rov yuborish mumkin edi, lekin ekran ochilishida
    ikkita so'rov — ikki barobar kutish. Ro'yxat baribir kichik.
  */
  const ridesQuery = useApiQuery<RidesResponse>('/api/v1/taxi/rides?pageSize=20');
  const rides = ridesQuery.data?.rides ?? [];

  /*
    Manzillar SHU YERDA bir marta so'raladi va ikki joyga beriladi:
    "Uy / Ish" tugmalariga va tanlash oynasiga. Har biri o'zi
    so'raganda, oyna ochilganda ikkinchi marta so'rov ketardi.
  */
  const addressesQuery = useApiQuery<{ addresses: QuickAddress[] }>('/api/v1/addresses');
  const addresses = addressesQuery.data?.addresses ?? [];

  const activeRide = rides.find((item) => isRideActive(item.status)) ?? null;

  useEffect(() => {
    if (activeRide) router.replace(`/taxi/${activeRide.id}`);
  }, [activeRide, router]);

  /*
    Narx faqat IKKALA nuqta tanlanganda so'raladi. Manzil yo'q
    holatda so'rov yuborish serverga behuda yuk bo'lardi va javob
    baribir xato bo'lardi.
  */
  const quotePath = useMemo(() => {
    if (!from || !to) return null;

    const params = new URLSearchParams({
      fromLat: String(from.latitude),
      fromLng: String(from.longitude),
      toLat: String(to.latitude),
      toLng: String(to.longitude),
    });

    return `/api/v1/taxi/quote?${params.toString()}`;
  }, [from, to]);

  const quoteQuery = useApiQuery<TaxiQuoteResponse>(quotePath);
  const quote = quoteQuery.data?.quote ?? null;

  const handleChoose = useCallback(
    (place: ChosenPlace) => {
      if (sheet === 'from') setFrom(place);
      if (sheet === 'to') setTo(place);

      setSheet(null);
    },
    [sheet],
  );

  const order = useCallback(async () => {
    if (!from || !to) return;

    setIsSending(true);
    setFormError(null);

    try {
      const result = await request<RideResponse>('/api/v1/taxi/rides', {
        method: 'POST',
        body: {
          tariff,
          fromLat: from.latitude,
          fromLng: from.longitude,
          fromAddress: from.address,
          toLat: to.latitude,
          toLng: to.longitude,
          toAddress: to.address,
          idempotencyKey,
        },
      });

      router.push(`/taxi/${result.ride.id}`);
    } catch (error) {
      setFormError(toUserMessage(error));
      setIsSending(false);
    }
  }, [from, idempotencyKey, request, router, tariff, to]);

  const mapCenter = from ?? to ?? DEFAULT_CENTER;

  return (
    <>
      <AppHeader title="Taksi" />

      <div className="space-y-4 px-4 pb-6">
        {/* ── Manzillar ─────────────────────────────────────────── */}
        <section className="bg-card border-border overflow-hidden rounded-3xl border shadow-sm">
          <h1 className="px-4 pt-4 pb-1 text-lg font-bold tracking-tight">Qayerga borasiz?</h1>

          <div className="p-1.5">
            <PlaceField
              kind="from"
              label="Qayerdan"
              value={from?.address ?? null}
              placeholder="Olish nuqtasini tanlang"
              onClick={() => setSheet('from')}
            />

            <div className="bg-border mx-4 h-px" />

            <PlaceField
              kind="to"
              label="Qayerga"
              value={to?.address ?? null}
              placeholder="Manzilni tanlang"
              onClick={() => setSheet('to')}
            />
          </div>
        </section>

        {/*
          ── Uy va Ish ─────────────────────────────────────────────
          Manzil qatorlaridan KEYIN va oxirgi manzillardan OLDIN:
          bu ikkisi eng ko'p ishlatiladigan tanlov, shuning uchun
          barmoqqa eng yaqin joyda turadi.
        */}
        {!to && <QuickPlaces addresses={addresses} onPick={setTo} />}

        {/*
          ── Oxirgi manzillar ──────────────────────────────────────
          Manzil qatorlari OSTIDA turadi: odam avval "qayerga?" degan
          savolni ko'radi, keyin tayyor javoblarni. Teskarisi bo'lsa,
          ro'yxat savoldan oldin kelib, uning ma'nosi yo'qolardi.
        */}
        {!to && <RecentPlaces rides={rides} onPick={setTo} />}

        {/*
          ── Xarita ────────────────────────────────────────────────
          Faqat kamida BITTA nuqta tanlanganda ko'rsatiladi.

          ── Nima uchun boshida yo'q ──────────────────────────────
          Bo'sh xarita hech narsa aytmaydi: u shunchaki shaharning
          tasodifiy bo'lagi. Ustiga, u ekranning uchdan birini
          egallab, ostidagi "oxirgi manzillar" ro'yxatini pastga
          surib yuborardi — holbuki odam eng ko'p aynan o'sha
          ro'yxatdan foydalanadi.

          Nuqta tanlanishi bilan xarita MA'NOGA ega bo'ladi va
          o'zi paydo bo'ladi.
        */}
        {(from || to) && (
          <section className="border-border overflow-hidden rounded-3xl border shadow-sm">
            <RideMap
              from={from}
              to={to}
              fallbackCenter={DEFAULT_CENTER}
              height={220}
              label={
                from && to
                  ? 'Xarita: olish va tushish nuqtalari'
                  : "Xarita: tanlangan nuqta"
              }
            />
          </section>
        )}

        {/* ── Tarif ─────────────────────────────────────────────── */}
        {from && to && (
          <section>
            <div className="mb-2.5 flex items-end justify-between px-1">
              <h2 className="text-sm font-semibold">Tarifni tanlang</h2>

              {quote && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {formatDistance(quote.distanceKm)}
                </span>
              )}
            </div>

            {quoteQuery.isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-[74px] rounded-2xl" />
                <Skeleton className="h-[74px] rounded-2xl" />
              </div>
            )}

            {quoteQuery.error && <Alert variant="error">{toUserMessage(quoteQuery.error)}</Alert>}

            {quote && (
              <div role="radiogroup" aria-label="Tarif" className="space-y-2">
                {quote.options.map((option) => (
                  <TariffOption
                    key={option.tariff}
                    option={option}
                    selected={option.tariff === tariff}
                    onSelect={() => setTariff(option.tariff)}
                  />
                ))}
              </div>
            )}

            <p className="text-muted-foreground mt-2.5 px-1 text-xs leading-relaxed">
              Narx masofa bo&apos;yicha oldindan hisoblanadi va safar oxirida o&apos;zgarmaydi. Pul
              chaqirganda hamyondan yechiladi.
            </p>
          </section>
        )}

        {formError && <Alert variant="error">{formError}</Alert>}

        {/* ── Chaqirish tugmasi ─────────────────────────────────── */}
        <Button
          fullWidth
          size="lg"
          disabled={!from || !to || !quote || isSending}
          isLoading={isSending}
          onClick={order}
        >
          <Car className="size-5" aria-hidden="true" />
          {quote ? 'Taksi chaqirish' : 'Manzilni tanlang'}
          {quote && <ArrowRight className="size-4" aria-hidden="true" />}
        </Button>
      </div>

      {/*
        Tarixga o'tish — CHAQIRISH tugmasidan keyin.

        `RecentPlaces` ichidagi "Barchasi" havolasi tarix bo'sh
        bo'lganda ko'rinmaydi. Bu qator esa har doim turadi, ya'ni
        tarixga borish yo'li hech qachon yopilmaydi.
      */}
      <div className="px-4 pb-6">
        <Link
          href="/taxi/tarix"
          className="border-border hover:bg-secondary/50 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 transition-colors"
        >
          <History className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 text-sm font-medium">Safarlar tarixi</span>
          <ChevronRight className="text-muted-foreground/60 size-4 shrink-0" aria-hidden="true" />
        </Link>
      </div>

      {sheet && (
        <PlaceSheet
          title={sheet === 'from' ? 'Qayerdan olamiz?' : 'Qayerga boramiz?'}
          addresses={addresses}
          fallbackCenter={mapCenter}
          onChoose={handleChoose}
          onClose={() => setSheet(null)}
        />
      )}
    </>
  );
}

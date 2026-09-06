'use client';

import { Navigation, PackageSearch, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistance } from '@/config/delivery-eta';
import { TAXI_SEARCH_RADIUS_KM } from '@/config/taxi';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatRelativeUz } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { useDriverLocation } from '@/modules/taxi/use-driver-location';
import type {
  DriverProfileResponse,
  RideOfferView,
  RideOffersResponse,
} from '@/modules/taxi/taxi.types';

/**
 * Yaqin atrofdagi ochiq buyurtmalar.
 *
 * ── Nima uchun JOYLASHUVSIZ ro'yxat ko'rsatilmaydi ────────────────────
 * "Yaqin atrofda" degan so'zning ma'nosi joylashuvga bog'liq. Usiz
 * butun shahar bo'ylab ro'yxat berish mumkin edi, lekin o'shanda
 * haydovchi 20 kilometr narigi buyurtmani qabul qilib, mijozni yarim
 * soat kuttirardi.
 *
 * Shuning uchun joylashuv yo'q bo'lsa, ro'yxat o'rniga SABAB
 * ko'rsatiladi va uni tuzatish yo'li aytiladi.
 */
export function DriverOffersContent() {
  const router = useRouter();
  const request = useApiClient();

  const profileQuery = useApiQuery<DriverProfileResponse>('/api/v1/taxi/driver');
  const driver = profileQuery.data?.driver ?? null;

  const location = useDriverLocation(driver?.isOnline ?? false);

  /*
    So'rov ONLAYN bo'lishi bilan yuboriladi — joylashuvni KUTMAYDI.

    ── Nima uchun kutmaydi ─────────────────────────────────────────
    Bu sahifada joylashuv so'raydigan tugma yo'q, shuning uchun
    brauzer ruxsat so'ramaydi. Kutilsa, sahifa abadiy "joylashuv
    kutilmoqda" deb turardi — bu boshi berk ko'cha edi.

    Koordinata bo'lmasa, server haydovchining oxirgi ma'lum
    nuqtasini ishlatadi (kabinetdagi kuzatuvdan yozilgan).

    Koordinata bor bo'lsa, u TO'RT xonagacha yaxlitlanadi (~11
    metr): aks holda GPS ning har mayda tebranishi yangi manzil
    yasab, ro'yxat soniyada bir necha marta qayta so'ralardi.
  */
  const path = !driver?.isOnline
    ? null
    : location.point
      ? `/api/v1/taxi/driver/offers?latitude=${location.point.latitude.toFixed(4)}&longitude=${location.point.longitude.toFixed(4)}`
      : '/api/v1/taxi/driver/offers';

  const offersQuery = useApiQuery<RideOffersResponse>(path, { refreshIntervalMs: 10_000 });
  const offers = offersQuery.data?.offers ?? [];

  const [actionError, setActionError] = useState<string | null>(null);
  const [takingId, setTakingId] = useState<string | null>(null);

  const accept = useCallback(
    async (offerId: string) => {
      setTakingId(offerId);
      setActionError(null);

      try {
        await request(`/api/v1/taxi/driver/rides/${offerId}/accept`, { method: 'POST' });

        /*
          Qabul qilingach kabinetga o'tamiz: safar boshqaruvi
          o'sha yerda va haydovchiga endi ro'yxat kerak emas.

          `window.location` ishlatilmaydi — u butun ilovani
          qaytadan yuklab, sekin tarmoqda bir necha soniya
          yo'qotardi. Next.js ning o'z yo'nalishi tezroq va
          kabinet ma'lumotni ochilganda o'zi so'raydi.
        */
        router.push('/driver');
      } catch (error) {
        setActionError(toUserMessage(error));
        setTakingId(null);
      }
    },
    [request, router],
  );

  return (
    <>
      <AdminHeader title="Yangi buyurtmalar" />

      <div className="space-y-3 px-4 pt-4 pb-6">
        {actionError && <Alert variant="error">{actionError}</Alert>}

        {!profileQuery.isLoading && !driver && (
          <Alert variant="warning">
            Avval mashina ma&apos;lumotini to&apos;ldiring — usiz buyurtma olib bo&apos;lmaydi.
          </Alert>
        )}

        {driver && !driver.isOnline && (
          <EmptyState
            icon={Navigation}
            title="Siz ishda emassiz"
            description="Buyurtmalarni ko'rish uchun kabinetdagi 'Ishdasiz' tugmasini yoqing."
          />
        )}

        {/*
          Yuklanish belgisi FAQAT so'rov yuborilganda.

          `path` null bo'lganda `useApiQuery` hech narsa so'ramaydi,
          lekin uning `isLoading` boshlang'ich qiymati `true`.
          Tekshirmasak, "siz ishda emassiz" yozuvining ostida ikkita
          bo'sh kartochka turib, ekran buzilgandek ko'rinardi.
        */}
        {path && offersQuery.isLoading && (
          <>
            <Skeleton className="h-28 rounded-3xl" />
            <Skeleton className="h-28 rounded-3xl" />
          </>
        )}

        {offersQuery.error && <Alert variant="error">{toUserMessage(offersQuery.error)}</Alert>}

        {path && !offersQuery.isLoading && !offersQuery.error && offers.length === 0 && (
          <EmptyState
            icon={PackageSearch}
            title="Hozircha buyurtma yo'q"
            description={`${TAXI_SEARCH_RADIUS_KM} km radiusda ochiq buyurtma topilmadi. Ro'yxat o'zi yangilanib turadi.`}
          />
        )}

        {offers.map((offer) => (
          <OfferCard
            key={offer.id}
            offer={offer}
            isTaking={takingId === offer.id}
            disabled={takingId !== null}
            onAccept={() => accept(offer.id)}
          />
        ))}

        {driver?.isOnline && location.error && (
          <Alert variant="warning">{location.error}</Alert>
        )}

        {path && offers.length > 0 && (
          <p className="text-muted-foreground flex items-center justify-center gap-1.5 pt-1 text-xs">
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Ro&apos;yxat har 10 soniyada yangilanadi
          </p>
        )}
      </div>
    </>
  );
}

/**
 * Bitta buyurtma.
 *
 * ── Nima uchun DAROMAD eng yirik raqam ────────────────────────────────
 * Haydovchi buyurtmani bir soniyada baholaydi va uning savoli bitta:
 * "arziydimi?". Javob ikkita raqamdan chiqadi — qancha olaman va
 * qancha yurishim kerak.
 *
 * Boshqa hamma narsa (manzil matni, vaqt) shundan keyin keladi.
 */
function OfferCard({
  offer,
  isTaking,
  disabled,
  onAccept,
}: {
  offer: RideOfferView;
  isTaking: boolean;
  disabled: boolean;
  onAccept: () => void;
}) {
  return (
    <section className="bg-card border-border space-y-3 rounded-3xl border p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Sizga tegadi</p>
          <p className="text-xl font-bold tabular-nums">{formatTiyin(offer.driverFeeTiyin)}</p>
        </div>

        <div className="text-right">
          <p className="text-muted-foreground text-[11px] tracking-wide uppercase">Olishgacha</p>
          <p className="text-xl font-bold tabular-nums">
            {formatDistance(offer.pickupDistanceKm)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Row label="Olish" text={offer.from.address} />
        <Row label="Tushish" text={offer.to.address} accent />
      </div>

      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>Safar: {formatDistance(offer.distanceKm)}</span>
        <span>{formatRelativeUz(offer.createdAt)}</span>
      </div>

      <Button fullWidth size="lg" isLoading={isTaking} disabled={disabled} onClick={onAccept}>
        Buyurtmani olaman
      </Button>
    </section>
  );
}

function Row({ label, text, accent }: { label: string; text: string; accent?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <span
        className={
          accent
            ? 'bg-primary mt-1.5 size-2 shrink-0 rounded-full'
            : 'bg-muted-foreground/50 mt-1.5 size-2 shrink-0 rounded-full'
        }
        aria-hidden="true"
      />
      <span className="min-w-0">
        <span className="text-muted-foreground block text-[11px] tracking-wide uppercase">
          {label}
        </span>
        <span className="block truncate text-sm">{text}</span>
      </span>
    </div>
  );
}

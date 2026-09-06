'use client';

import {
  Car,
  CheckCircle2,
  ChevronRight,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { RideMap } from '@/components/map/ride-map';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { formatDistance } from '@/config/delivery-eta';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzPhone } from '@/lib/phone';
import { useDriverLocation } from '@/modules/taxi/use-driver-location';
import {
  RIDE_STATUS_LABEL,
  isRideActive,
  type DriverProfileResponse,
  type RideResponse,
  type RideView,
  type RidesResponse,
} from '@/modules/taxi/taxi.types';

/**
 * Haydovchi kabineti — bosh ekran.
 *
 * ── Ekran BITTA savolga javob beradi: hozir nima qilishim kerak ───────
 * Haydovchi telefonni rulda ushlab turadi va unga uzun ro'yxat kerak
 * emas. Shuning uchun ekranda faqat:
 *
 *  · ishdamanmi (bitta tugma);
 *  · qo'limdagi safar va uning KEYINGI qadami (bitta katta tugma);
 *  · safar bo'lmasa — buyurtmalarga o'tish.
 *
 * Statistika pastda: u qiziq, lekin shoshilinch emas.
 */
export function DriverDashboardContent() {
  const router = useRouter();
  const request = useApiClient();

  const profileQuery = useApiQuery<DriverProfileResponse>('/api/v1/taxi/driver');
  const driver = profileQuery.data?.driver ?? null;

  /*
    Faol safar har 6 soniyada so'raladi.

    Mijoz safarni bekor qilishi mumkin va haydovchi buni TEZ bilishi
    kerak — aks holda u bekor qilingan manzilga yetib borardi.
    Profilsiz so'rov yuborilmaydi: server baribir 403 qaytarardi.
  */
  const ridesQuery = useApiQuery<RidesResponse>(
    driver ? '/api/v1/taxi/driver/rides?active=true&pageSize=1' : null,
    { refreshIntervalMs: 6_000 },
  );

  const ride = ridesQuery.data?.rides?.find((item) => isRideActive(item.status)) ?? null;

  const location = useDriverLocation(driver?.isOnline ?? false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [isChatOpening, setIsChatOpening] = useState(false);

  /**
   * Yo'lovchi bilan suhbatni ochadi.
   *
   * Yo'lovchi ekranidagi bilan AYNI yo'l ishlatiladi: server kim
   * so'rayotganini o'zi aniqlaydi va ikkinchi tomonni topadi.
   */
  const openChat = useCallback(
    async (rideId: string) => {
      setIsChatOpening(true);
      setActionError(null);

      try {
        const result = await request<{ conversationId: string }>(
          `/api/v1/taxi/rides/${rideId}/chat`,
          { method: 'POST' },
        );

        router.push(`/messages/${result.conversationId}`);
      } catch (error) {
        setActionError(toUserMessage(error));
        setIsChatOpening(false);
      }
    },
    [request, router],
  );

  const toggleOnline = useCallback(
    async (next: boolean) => {
      setIsWorking(true);
      setActionError(null);

      try {
        const result = await request<DriverProfileResponse>('/api/v1/taxi/driver', {
          method: 'PATCH',
          body: { isOnline: next },
        });

        profileQuery.setData(result);

        /*
          Kuzatuv aynan SHU YERDA yoqiladi — tugma bosilgan lahzada.
          Brauzer joylashuv ruxsatini faqat foydalanuvchi harakatidan
          keyin so'raydi (sabab `use-driver-location.ts` da).
        */
        if (next) location.start();
        else location.stop();
      } catch (error) {
        setActionError(toUserMessage(error));
      } finally {
        setIsWorking(false);
      }
    },
    [location, profileQuery, request],
  );

  const act = useCallback(
    async (path: string, body: unknown) => {
      setIsWorking(true);
      setActionError(null);

      try {
        const result = await request<RideResponse>(path, { method: 'POST', body });

        ridesQuery.setData({ rides: [result.ride], total: 1 });
      } catch (error) {
        setActionError(toUserMessage(error));
      } finally {
        setIsWorking(false);
      }
    },
    [request, ridesQuery],
  );

  if (profileQuery.isLoading) {
    return (
      <>
        <AdminHeader title="Haydovchi kabineti" />
        <div className="space-y-3 px-4 pt-4">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-48 rounded-3xl" />
        </div>
      </>
    );
  }

  /*
    Profil YO'Q — bu birinchi qadam, xato emas.

    Boshqa hech narsa ko'rsatilmaydi: onlayn tugmasi ham, buyurtmalar
    ham profilsiz ma'nosiz. Bitta yo'l qoldirilgani ataylab.
  */
  if (!driver) {
    return (
      <>
        <AdminHeader title="Haydovchi kabineti" />
        <div className="px-4 pt-4">
          <EmptyState
            icon={Car}
            title="Mashinangizni kiriting"
            description="Buyurtma olishdan oldin mashina rusumi, rangi va davlat raqamini to'ldiring — mijoz sizni shu ma'lumot bo'yicha taniydi."
            action={
              <Link
                href="/driver/profile"
                className="bg-primary text-primary-foreground shadow-primary/25 inline-flex h-11 items-center rounded-xl px-5 text-sm font-medium shadow-lg transition-transform active:scale-[0.98]"
              >
                Mashina ma&apos;lumotini kiritish
              </Link>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="Haydovchi kabineti" />

      <div className="space-y-4 px-4 pt-4 pb-6">
        <OnlineCard
          isOnline={driver.isOnline}
          disabled={isWorking}
          locationStatus={location.status}
          locationError={location.error}
          onToggle={toggleOnline}
        />

        {actionError && <Alert variant="error">{actionError}</Alert>}

        {ride ? (
          <ActiveRideCard
            ride={ride}
            disabled={isWorking}
            isChatOpening={isChatOpening}
            onStep={(step) => act(`/api/v1/taxi/driver/rides/${ride.id}/step`, { step })}
            onComplete={() => act(`/api/v1/taxi/driver/rides/${ride.id}/complete`, {})}
            onCancel={() => setAskCancel(true)}
            onChat={() => openChat(ride.id)}
          />
        ) : (
          <Link
            href="/driver/offers"
            className="from-primary to-accent text-primary-foreground flex items-center gap-4 rounded-3xl bg-gradient-to-br p-5 transition-transform active:scale-[0.99]"
          >
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <Navigation className="size-6" aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-xs opacity-90">Yangi buyurtmalar</span>
              <span className="block text-lg font-semibold">Yaqin atrofda qidirish</span>
            </span>

            <ChevronRight className="size-5 shrink-0 opacity-80" aria-hidden="true" />
          </Link>
        )}

        <DriverStats
          rating={driver.rating}
          ratingCount={driver.ratingCount}
          completedRides={driver.completedRides}
        />

        <Link
          href="/driver/profile"
          className="border-border hover:bg-secondary/50 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 transition-colors"
        >
          <Car className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">
              {driver.carColor} {driver.carModel}
            </span>
            <span className="text-muted-foreground block font-mono text-xs tracking-wider">
              {driver.plateNumber}
            </span>
          </span>
          <ChevronRight className="text-muted-foreground/60 size-4 shrink-0" aria-hidden="true" />
        </Link>
      </div>

      <ConfirmDialog
        open={askCancel}
        title="Safardan voz kechasizmi?"
        description="Mijozga puli to'liq qaytariladi va u xabar oladi. Tez-tez voz kechish reytingingizga ta'sir qiladi."
        confirmLabel="Ha, voz kechaman"
        cancelLabel="Yo'q"
        isDestructive
        onCancel={() => setAskCancel(false)}
        onConfirm={async () => {
          setAskCancel(false);

          if (ride) await act(`/api/v1/taxi/driver/rides/${ride.id}/cancel`, {});
        }}
      />
    </>
  );
}

/**
 * Onlayn tugmasi.
 *
 * ── Nima uchun joylashuv holati SHU YERDA ko'rsatiladi ────────────────
 * Onlayn bo'lib, lekin joylashuv yubormayotgan haydovchiga buyurtma
 * TUSHMAYDI — u yaqin atrofdagilar ro'yxatiga kirmaydi.
 *
 * Bu holatni aytmasak, haydovchi soatlab kutib o'tirib, "ilova
 * ishlamayapti" degan xulosaga kelardi. Shuning uchun ogohlantirish
 * aynan tugmaning yonida turadi.
 */
function OnlineCard({
  isOnline,
  disabled,
  locationStatus,
  locationError,
  onToggle,
}: {
  isOnline: boolean;
  disabled: boolean;
  locationStatus: string;
  locationError: string | null;
  onToggle: (next: boolean) => void;
}) {
  return (
    <section className="bg-card border-border rounded-3xl border p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span
          className={
            isOnline
              ? 'bg-success/15 text-success flex size-11 shrink-0 items-center justify-center rounded-2xl'
              : 'bg-secondary text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl'
          }
        >
          <Car className="size-5" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{isOnline ? 'Ishdasiz' : 'Ish tugadi'}</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {isOnline ? 'Buyurtmalar sizga ko\'rinadi' : 'Buyurtmalar kelmaydi'}
          </p>
        </div>

        <Switch
          checked={isOnline}
          disabled={disabled}
          onCheckedChange={onToggle}
          label={isOnline ? 'Ishni tugatish' : 'Ishni boshlash'}
        />
      </div>

      {isOnline && locationStatus !== 'SHARING' && (
        <Alert variant="warning" className="mt-3">
          {locationError ??
            "Joylashuv aniqlanmoqda. U yoqilmaguncha yaqin atrofdagi buyurtmalar sizga tushmaydi."}
        </Alert>
      )}
    </section>
  );
}

/**
 * Qo'ldagi safar va uning KEYINGI qadami.
 *
 * ── Nima uchun bitta katta tugma ──────────────────────────────────────
 * Haydovchi bu tugmani harakatdagi mashinada, ba'zan chorrahada
 * bosadi. Uchta kichik tugma orasidan to'g'risini tanlash — ortiqcha
 * fikrlash va u yo'lga qaramaslikka olib keladi.
 *
 * Shuning uchun ekranda HAR DOIM bitta asosiy amal turadi: hozirgi
 * holatdan keyingi qadam. Qaysi qadam ekanini SERVER hal qiladi,
 * ekran esa uni nom bilan ko'rsatadi.
 */
const NEXT_STEP: Record<string, { label: string; icon: typeof MapPin } | undefined> = {
  ACCEPTED: { label: 'Yetib keldim', icon: MapPin },
  ARRIVED: { label: 'Safarni boshlash', icon: Navigation },
  IN_PROGRESS: { label: 'Safarni yakunlash', icon: CheckCircle2 },
};

function ActiveRideCard({
  ride,
  disabled,
  isChatOpening,
  onStep,
  onComplete,
  onCancel,
  onChat,
}: {
  ride: RideView;
  disabled: boolean;
  isChatOpening: boolean;
  onStep: (step: 'ARRIVED' | 'START') => void;
  onComplete: () => void;
  onCancel: () => void;
  onChat: () => void;
}) {
  const next = NEXT_STEP[ride.status];
  const Icon = next?.icon ?? Car;

  return (
    <section className="bg-card border-border overflow-hidden rounded-3xl border shadow-sm">
      <RideMap
        from={ride.from}
        to={ride.to}
        driver={ride.driverLocation}
        height={180}
        label={`Xarita: ${RIDE_STATUS_LABEL[ride.status]}`}
      />

      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-primary text-sm font-semibold">{RIDE_STATUS_LABEL[ride.status]}</p>
          <p className="text-sm font-bold tabular-nums">{formatDistance(ride.distanceKm)}</p>
        </div>

        {/*
          Yo'lovchiga qo'ng'iroq.

          Manzilda mijozni topa olmaslik — eng ko'p uchraydigan
          holat: hovlida ikkita darvoza, uy raqami ko'rinmaydi,
          mijoz boshqa tomonda turibdi. Qo'ng'iroqsiz haydovchi
          shunchaki kutadi.
        */}
        <div className="bg-secondary/60 flex items-center gap-3 rounded-2xl px-3.5 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="text-muted-foreground block text-[11px] tracking-wide uppercase">
              Yo&apos;lovchi
            </span>
            <span className="block truncate text-sm font-medium">
              {ride.rider.name ?? 'Mijoz'}
            </span>
          </span>

          {/*
            Chat qo'ng'iroqdan OLDIN turadi.

            Haydovchi rulda: yozishmani svetoforda o'qish mumkin,
            qo'ng'iroq esa e'tiborni butunlay tortadi. Shuning
            uchun kamroq xavfli yo'l birinchi.
          */}
          <button
            type="button"
            onClick={onChat}
            disabled={isChatOpening}
            aria-label="Yo'lovchiga yozish"
            className="bg-background text-foreground border-border flex size-10 shrink-0 items-center justify-center rounded-xl border transition-transform active:scale-95 disabled:opacity-50"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
          </button>

          <a
            href={`tel:${ride.rider.phone}`}
            aria-label={`Yo'lovchiga qo'ng'iroq: ${formatUzPhone(ride.rider.phone)}`}
            className="bg-primary text-primary-foreground shadow-primary/25 flex size-10 shrink-0 items-center justify-center rounded-xl shadow-lg transition-transform active:scale-95"
          >
            <Phone className="size-4" aria-hidden="true" />
          </a>
        </div>

        <div className="space-y-2">
          <Place label="Olish" text={ride.from.address} />
          <Place label="Tushish" text={ride.to.address} accent />
        </div>

        {next && (
          <Button
            fullWidth
            size="lg"
            disabled={disabled}
            onClick={() => {
              if (ride.status === 'IN_PROGRESS') onComplete();
              else onStep(ride.status === 'ACCEPTED' ? 'ARRIVED' : 'START');
            }}
          >
            <Icon className="size-5" aria-hidden="true" />
            {next.label}
          </Button>
        )}

        {/*
          Yo'lda voz kechish mumkin EMAS: yo'lovchi mashinada.
          Server ham buni rad etadi, tugmani ko'rsatib turish esa
          yolg'on imkoniyat bo'lardi.
        */}
        {ride.status !== 'IN_PROGRESS' && (
          <Button fullWidth variant="ghost" disabled={disabled} onClick={onCancel}>
            Voz kechish
          </Button>
        )}
      </div>
    </section>
  );
}

function Place({ label, text, accent }: { label: string; text: string; accent?: boolean }) {
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
        <span className="block text-sm">{text}</span>
      </span>
    </div>
  );
}

function DriverStats({
  rating,
  ratingCount,
  completedRides,
}: {
  rating: number | null;
  ratingCount: number;
  completedRides: number;
}) {
  return (
    <section className="bg-card border-border grid grid-cols-2 gap-2 rounded-3xl border p-4 text-center shadow-sm">
      <div>
        <Star className="text-muted-foreground mx-auto size-4" aria-hidden="true" />
        <p className="text-muted-foreground mt-1.5 text-[11px] tracking-wide uppercase">Reyting</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">
          {rating === null ? 'Hali yo\'q' : `${rating} (${ratingCount})`}
        </p>
      </div>

      <div>
        <CheckCircle2 className="text-muted-foreground mx-auto size-4" aria-hidden="true" />
        <p className="text-muted-foreground mt-1.5 text-[11px] tracking-wide uppercase">Safarlar</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums">{completedRides}</p>
      </div>
    </section>
  );
}

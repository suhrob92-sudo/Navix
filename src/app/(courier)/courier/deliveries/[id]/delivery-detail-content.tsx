'use client';

import { MapPin, MessageSquare, Package, Phone, Store, User, UtensilsCrossed } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AdminHeader } from '@/components/admin/admin-header';
import { LocationShareCard } from '@/components/courier/location-share-card';
import { ServiceIcon } from '@/components/app/service-icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatTiyin } from '@/lib/money';
import { formatUzPhone } from '@/lib/phone';
import {
  DELIVERY_ACTION_LABELS,
  DELIVERY_KIND_LABELS,
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_VARIANTS,
  canRelease,
  nextStatus,
  type DeliveryResponse,
} from '@/modules/courier/courier.types';
import { RequireCourier } from '@/modules/courier/require-courier';

export interface DeliveryDetailContentProps {
  deliveryId: string;
}

/**
 * Topshiriq kartochkasi — kuryerning ish ekrani.
 *
 * ── Nima uchun telefon raqamlari KATTA va bosiladigan ─────────────────
 * Kuryer yo'lda, bir qo'li rulda. Eng ko'p qiladigan ishi — qo'ng'iroq
 * qilish ("eshik oldidaman", "domofon ishlamayapti"). Shuning uchun
 * raqamlar `tel:` havolasi: bitta bosishda qo'ng'iroq ketadi va
 * raqamni ko'chirib o'tirish shart emas.
 *
 * ── Nima uchun bitta katta tugma ──────────────────────────────────────
 * Bosqich bitta: "oldim" yoki "topshirdim". Tanlov qanchalik kam
 * bo'lsa, harakatdagi odam shunchalik kam xato qiladi.
 */
export function DeliveryDetailContent({ deliveryId }: DeliveryDetailContentProps) {
  return (
    <RequireCourier>
      <DeliveryBody deliveryId={deliveryId} />
    </RequireCourier>
  );
}

function DeliveryBody({ deliveryId }: DeliveryDetailContentProps) {
  const request = useApiClient();
  const router = useRouter();

  const { data, isLoading, error, setData } = useApiQuery<DeliveryResponse>(
    `/api/v1/courier/deliveries/${deliveryId}`,
    { refreshIntervalMs: 25_000 },
  );

  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
  const [isReleaseOpen, setIsReleaseOpen] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');

  const delivery = data?.delivery ?? null;
  const isOffered = delivery?.status === 'OFFERED';
  const next = delivery && !isOffered ? nextStatus(delivery.status) : null;
  const showRelease = delivery ? canRelease(delivery.status) && !isOffered : false;
  const KindIcon = delivery?.kind === 'MARKET' ? Package : UtensilsCrossed;

  async function accept() {
    setIsSaving(true);
    setActionError(null);

    try {
      const response = await request<DeliveryResponse>(`/api/v1/courier/deliveries/${deliveryId}/accept`, {
        method: 'POST',
      });

      setData(response);
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  async function changeStatus(status: string, reason?: string) {
    setIsSaving(true);
    setActionError(null);

    try {
      const response = await request<DeliveryResponse>(`/api/v1/courier/deliveries/${deliveryId}`, {
        method: 'PATCH',
        body: { status, ...(reason ? { reason } : {}) },
      });

      setData(response);
      setIsAdvanceOpen(false);
      setIsReleaseOpen(false);
      setReleaseReason('');

      // Voz kechilgan topshiriq endi begona — ro'yxatga qaytamiz.
      if (status === 'OFFERED') {
        router.replace('/courier/available');
      }
    } catch (caught) {
      setActionError(toUserMessage(caught));
      setIsAdvanceOpen(false);
      setIsReleaseOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <AdminHeader title={delivery?.orderNumber ?? 'Topshiriq'} showBack backHref="/courier" />

      <div className="space-y-5 px-4 pt-4">
        {isLoading && (
          <>
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Topshiriqni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {actionError && <Alert variant="error">{actionError}</Alert>}

        {delivery && (
          <>
            {/* Haq va holat */}
            <div className="bg-card border-border animate-fade-up rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <Badge variant={DELIVERY_STATUS_VARIANTS[delivery.status]}>
                  {DELIVERY_STATUS_LABELS[delivery.status]}
                </Badge>
                <div className="text-right">
                  <p className="text-muted-foreground text-xs">Yetkazish haqi</p>
                  <p className="text-xl font-semibold tabular-nums">{formatTiyin(delivery.fee)}</p>
                </div>
              </div>
            </div>

            {/* Qayerdan olinadi */}
            <section className="bg-card border-border rounded-2xl border p-4">
              <h2 className="text-sm font-semibold">Qayerdan olinadi</h2>

              <div className="mt-3 flex items-center gap-3">
                <ServiceIcon icon={KindIcon} color={delivery.pickup.color} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{delivery.pickup.name}</p>
                  <p className="text-muted-foreground text-xs">{DELIVERY_KIND_LABELS[delivery.kind]}</p>
                </div>
              </div>

              <ul className="border-border/60 mt-3 space-y-2 border-t pt-3">
                {delivery.items.map((item) => (
                  <li key={item.name} className="flex items-baseline gap-2">
                    {/* Son KATTA: kuryer qopni to'ldirayotganda shuni o'qiydi */}
                    <span className="text-base font-semibold tabular-nums">{`${item.quantity} ×`}</span>
                    <span className="min-w-0 text-base">{item.name}</span>
                  </li>
                ))}
              </ul>

              <p className="text-muted-foreground border-border/60 mt-3 flex items-center gap-1.5 border-t pt-3 text-xs">
                <Store className="size-3.5 shrink-0" aria-hidden="true" />
                {`Buyurtma summasi: ${formatTiyin(delivery.orderTotal)} — mijoz allaqachon to'lagan`}
              </p>
            </section>

            {/* Qayerga eltiladi */}
            <section className="bg-card border-border rounded-2xl border p-4">
              <h2 className="text-sm font-semibold">Qayerga eltiladi</h2>

              <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed">
                <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {delivery.dropoffAddress}
              </p>

              {delivery.dropoffNote && (
                <p className="text-muted-foreground mt-2 flex items-start gap-2 text-xs leading-relaxed">
                  <MessageSquare className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {delivery.dropoffNote}
                </p>
              )}

              <p className="mt-3 flex items-start gap-2 text-sm">
                <User className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {delivery.customer.name ?? 'Ism kiritilmagan'}
              </p>

              {/*
                Raqam faqat topshiriq OLINGANDAN keyin ochiladi.
                Umumiy ro'yxatdagi topshiriqda u ko'rinmasligi kerak:
                buyurtma bermagan odamning raqami begonaga tegmasin.
              */}
              {isOffered ? (
                <p className="text-muted-foreground mt-2 flex items-start gap-2 text-xs">
                  <Phone className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  Mijozning raqami topshiriqni olganingizdan keyin ochiladi
                </p>
              ) : (
                <a
                  href={`tel:${delivery.customer.phone}`}
                  className="text-primary mt-2 flex items-center gap-2 text-base font-medium"
                >
                  <Phone className="size-4 shrink-0" aria-hidden="true" />
                  {formatUzPhone(delivery.customer.phone)}
                </a>
              )}
            </section>

            {/*
              Joylashuv — topshiriq kuryerning qo'lida turganda.
              Umumiy ro'yxatdagi (egasiz) topshiriqda ma'nosi yo'q.
            */}
            <LocationShareCard
              deliveryId={delivery.id}
              isActive={delivery.status === 'ACCEPTED' || delivery.status === 'PICKED_UP'}
            />

            {/* Amallar */}
            <div className="space-y-2">
              {isOffered && (
                <>
                  <Button fullWidth size="lg" onClick={accept} isLoading={isSaving} loadingText="Olinmoqda...">
                    Topshiriqni olaman
                  </Button>
                  <p className="text-muted-foreground pt-1 text-center text-xs leading-relaxed">
                    Olganingizdan keyin mijozning raqami ochiladi va u sizning ismingizni ko&apos;radi.
                  </p>
                </>
              )}

              {next && (
                <Button fullWidth size="lg" onClick={() => setIsAdvanceOpen(true)} disabled={isSaving}>
                  {DELIVERY_ACTION_LABELS[delivery.status]}
                </Button>
              )}

              {showRelease && (
                <Button variant="outline" fullWidth onClick={() => setIsReleaseOpen(true)} disabled={isSaving}>
                  Topshiriqdan voz kechish
                </Button>
              )}

              {delivery.status === 'DELIVERED' && (
                <Alert variant="success">
                  {`Yetkazildi. ${formatTiyin(delivery.fee)} hamyoningizga yozildi.`}
                </Alert>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={isAdvanceOpen}
        title={delivery ? DELIVERY_ACTION_LABELS[delivery.status] : ''}
        description={
          delivery?.status === 'PICKED_UP'
            ? `Buyurtma mijozga topshirildi deb belgilanadi va ${formatTiyin(delivery.fee)} hamyoningizga yoziladi.`
            : 'Mijozga "kuryer yo\'lga chiqdi" degan xabar yuboriladi.'
        }
        confirmLabel="Tasdiqlash"
        isLoading={isSaving}
        onConfirm={() => next && changeStatus(next)}
        onCancel={() => setIsAdvanceOpen(false)}
      />

      {/*
        Voz kechish — topshiriq umumiy ro'yxatga QAYTADI.
        Sabab so'raladi: takrorlanadigan sabablar tizimdagi
        muammoni ko'rsatadi (masalan restoran doim kechikadi).
      */}
      {isReleaseOpen && delivery && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="bg-card animate-scale-in w-full max-w-md rounded-2xl p-6">
            <h2 className="text-lg font-semibold tracking-tight">Topshiriqdan voz kechish</h2>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              Topshiriq umumiy ro&apos;yxatga qaytadi va uni boshqa kuryer olishi mumkin. Haq ham sizga yozilmaydi.
            </p>

            <Field id="release-reason" label="Sabab" required hint="Nima uchun ololmadingiz?" className="mt-4">
              <Input
                id="release-reason"
                value={releaseReason}
                onChange={(event) => setReleaseReason(event.target.value)}
                placeholder="Masalan: mototsikl buzildi"
                disabled={isSaving}
              />
            </Field>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setIsReleaseOpen(false)} disabled={isSaving}>
                Bekor qilish
              </Button>
              <Button
                variant="destructive"
                isLoading={isSaving}
                loadingText="Yuborilmoqda..."
                disabled={releaseReason.trim().length < 3}
                onClick={() => changeStatus('OFFERED', releaseReason.trim())}
              >
                Voz kechaman
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

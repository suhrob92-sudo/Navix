'use client';

import { MapPin, ShoppingBag, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { QuantityStepper } from '@/components/food/quantity-stepper';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { AddressItem } from '@/app/(cabinet)/addresses/addresses-content';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import { MAX_ITEM_QUANTITY } from '@/modules/food/food.schemas';
import type { FoodOrderResponse, RestaurantResponse } from '@/modules/food/food.types';
import { useCart } from '@/modules/food/use-cart';
import type { WalletSummary } from '@/modules/wallet/wallet.types';

interface AddressesResponse {
  addresses: AddressItem[];
}

/**
 * Savat va buyurtmani tasdiqlash.
 *
 * ── Nima uchun menyu qayta yuklanadi ──────────────────────────────────
 * Savatda faqat taom ID'si va soni saqlanadi. Nom va narx bu yerda
 * MENYUDAN olinadi — ya'ni foydalanuvchi doim joriy narxni ko'radi.
 * Agar restoran narxni oshirgan bo'lsa, savat ochilganda yangi narx
 * chiqadi va odam nimaga rozi bo'layotganini biladi.
 *
 * Yakuniy summa baribir SERVERDA qayta hisoblanadi — bu yerdagi
 * hisob faqat ko'rsatish uchun.
 */
export function CartContent() {
  const router = useRouter();
  const request = useApiClient();
  const cart = useCart();

  const [addressId, setAddressId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restaurant = useApiQuery<RestaurantResponse>(
    cart.isReady && cart.restaurantSlug ? `/api/v1/food/restaurants/${cart.restaurantSlug}` : null,
  );
  const addresses = useApiQuery<AddressesResponse>('/api/v1/addresses');
  const wallet = useApiQuery<WalletSummary>('/api/v1/wallet');

  const menuItems = (restaurant.data?.restaurant.categories ?? []).flatMap((category) => category.items);
  const itemById = new Map(menuItems.map((item) => [item.id, item]));

  const lines = cart.lines.flatMap((line) => {
    const item = itemById.get(line.menuItemId);
    if (!item) return [];

    return [{ ...line, name: item.name, price: item.price, isAvailable: item.isAvailable }];
  });

  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const deliveryFee = restaurant.data?.restaurant.deliveryFee ?? 0;
  const minOrder = restaurant.data?.restaurant.minOrder ?? 0;
  const total = subtotal + deliveryFee;

  const addressList = addresses.data?.addresses ?? [];
  const selectedAddressId =
    addressId ?? addressList.find((address) => address.isDefault)?.id ?? addressList[0]?.id ?? null;

  const balance = wallet.data?.available ?? 0;
  const isBelowMinimum = subtotal > 0 && subtotal < minOrder;
  const hasUnavailable = lines.some((line) => !line.isAvailable);
  const hasEnoughMoney = balance >= total;

  const canSubmit =
    lines.length > 0 &&
    !isBelowMinimum &&
    !hasUnavailable &&
    hasEnoughMoney &&
    selectedAddressId !== null &&
    (restaurant.data?.restaurant.isOpen ?? false);

  async function submit() {
    if (!cart.restaurantId || !selectedAddressId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await request<FoodOrderResponse>('/api/v1/food/orders', {
        method: 'POST',
        body: {
          restaurantId: cart.restaurantId,
          addressId: selectedAddressId,
          items: cart.lines,
          ...(note.trim() ? { deliveryNote: note.trim() } : {}),
          idempotencyKey: createIdempotencyKey(),
        },
      });

      cart.clear();
      router.push(`/orders/${response.order.id}`);
    } catch (caught) {
      setError(toUserMessage(caught));
      setIsSubmitting(false);
    }
  }

  const isLoading = !cart.isReady || (cart.restaurantSlug !== null && restaurant.isLoading);

  return (
    <>
      <AppHeader
        title="Savat"
        showBack
        backHref={cart.restaurantSlug ? `/food/${cart.restaurantSlug}` : '/food'}
      />

      <div className="px-4 pt-4">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        )}

        {!isLoading && lines.length === 0 && (
          <EmptyState
            icon={ShoppingBag}
            title="Savat bo'sh"
            description="Restoran tanlang va yoqqan taomlarni savatga qo'shing."
            action={
              <Button asChild>
                <Link href="/food">Restoranlarni ko&apos;rish</Link>
              </Button>
            }
          />
        )}

        {!isLoading && lines.length > 0 && (
          <>
            <p className="text-muted-foreground mb-3 text-sm">{cart.restaurantName}</p>

            {/* Taomlar */}
            <ul className="space-y-2">
              {lines.map((line) => (
                <li
                  key={line.menuItemId}
                  className={cn(
                    'bg-card border-border flex items-center gap-3 rounded-2xl border p-3',
                    !line.isAvailable && 'border-destructive/40',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.name}</p>
                    <p className="text-muted-foreground text-xs tabular-nums">
                      {`${formatTiyin(line.price)} × ${line.quantity} = ${formatTiyin(line.price * line.quantity)}`}
                    </p>
                    {!line.isAvailable && <p className="text-destructive mt-1 text-xs">Hozir mavjud emas</p>}
                  </div>

                  <QuantityStepper
                    quantity={line.quantity}
                    max={MAX_ITEM_QUANTITY}
                    onDecrease={() => cart.setQuantity(line.menuItemId, line.quantity - 1)}
                    onIncrease={() => cart.setQuantity(line.menuItemId, line.quantity + 1)}
                  />
                </li>
              ))}
            </ul>

            {/* Manzil */}
            <section className="mt-6">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <MapPin className="size-4" aria-hidden="true" />
                Yetkazish manzili
              </h2>

              {addresses.isLoading && <Skeleton className="h-16 rounded-2xl" />}

              {!addresses.isLoading && addressList.length === 0 && (
                <Alert variant="warning" title="Manzil qo'shilmagan">
                  Buyurtma berish uchun avval yetkazish manzilini qo&apos;shing.{' '}
                  <Link href="/addresses" className="text-primary font-medium underline">
                    Manzil qo&apos;shish
                  </Link>
                </Alert>
              )}

              <ul className="space-y-2">
                {addressList.map((address) => (
                  <li key={address.id}>
                    <button
                      type="button"
                      onClick={() => setAddressId(address.id)}
                      aria-pressed={selectedAddressId === address.id}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors',
                        selectedAddressId === address.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:bg-secondary/50',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                          selectedAddressId === address.id ? 'border-primary' : 'border-border',
                        )}
                        aria-hidden="true"
                      >
                        {selectedAddressId === address.id && <span className="bg-primary size-2 rounded-full" />}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{address.label}</span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {[address.city, address.district, address.street, address.building]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <Field id="note" label="Kuryer uchun izoh" hint="Ixtiyoriy" className="mt-4">
                <Input
                  id="note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="2-podyezd, domofon 45"
                  maxLength={255}
                  disabled={isSubmitting}
                />
              </Field>
            </section>

            {/* Hisob */}
            <section className="bg-card border-border mt-6 rounded-2xl border p-4">
              <dl className="space-y-2 text-sm">
                <Row label="Taomlar" value={formatTiyin(subtotal)} />
                <Row label="Yetkazish" value={formatTiyin(deliveryFee)} />
                <div className="border-border/60 flex items-baseline justify-between border-t pt-2 text-base font-semibold">
                  <dt>Jami</dt>
                  <dd className="tabular-nums">{formatTiyin(total)}</dd>
                </div>
              </dl>

              <div className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
                <Wallet className="size-3.5" aria-hidden="true" />
                {`Hamyonda ${formatTiyin(balance)}`}
              </div>
            </section>

            {/* Xatolik va cheklovlar */}
            {isBelowMinimum && (
              <Alert variant="warning" title="Summa yetarli emas" className="mt-4">
                {`Eng kam buyurtma — ${formatTiyin(minOrder)}. Yana ${formatTiyin(minOrder - subtotal)} lik taom qo'shing.`}
              </Alert>
            )}

            {hasUnavailable && (
              <Alert variant="error" title="Ba'zi taomlar tugagan" className="mt-4">
                Ularni savatdan olib tashlang.
              </Alert>
            )}

            {!hasEnoughMoney && !isBelowMinimum && (
              <Alert variant="error" title="Hamyonda mablag' yetarli emas" className="mt-4">
                {`Yana ${formatTiyin(total - balance)} kerak. `}
                <Link href="/wallet/topup" className="text-primary font-medium underline">
                  Hisobni to&apos;ldirish
                </Link>
              </Alert>
            )}

            {error && (
              <Alert variant="error" className="mt-4">
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              size="lg"
              className="mt-5"
              disabled={!canSubmit}
              isLoading={isSubmitting}
              loadingText="Buyurtma berilmoqda..."
              onClick={submit}
            >
              {canSubmit ? `${formatTiyin(total)} — buyurtma berish` : 'Buyurtma berish'}
            </Button>

            <p className="text-muted-foreground mt-3 mb-2 text-center text-xs leading-relaxed">
              Tasdiqlaganingizda summa hamyoningizdan yechiladi. Buyurtmani oshxona tayyorlashni boshlagunicha
              bekor qilib, pulni qaytarib olishingiz mumkin.
            </p>
          </>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

/**
 * Takroriy so'rovlarni ajratish uchun bir martalik kalit.
 *
 * Tugma ikki marta bosilsa ham server ikkinchi buyurtmani yaratmaydi:
 * kalit bazada UNIQUE.
 */
function createIdempotencyKey(): string {
  return `food-${crypto.randomUUID()}`;
}

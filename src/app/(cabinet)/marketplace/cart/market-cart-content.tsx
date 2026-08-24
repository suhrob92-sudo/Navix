'use client';

import { Bookmark, MapPin, ShoppingCart, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { QuantityStepper } from '@/components/market/quantity-stepper';
import { SavedForLater } from '@/components/market/saved-for-later';
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
import { createIdempotencyKey } from '@/modules/wallet/wallet.schemas';
import { MAX_ITEM_QUANTITY } from '@/modules/market/market.schemas';
import type { MarketOrderResponse, ShopResponse } from '@/modules/market/market.types';
import { cartLineKey } from '@/config/cart';
import { resetCartState, useMarketCart } from '@/modules/market/use-market-cart';
import type { WalletSummary } from '@/modules/wallet/wallet.types';

interface AddressesResponse {
  addresses: AddressItem[];
}

/**
 * Savat va buyurtmani tasdiqlash.
 *
 * ── Nima uchun do'kon qayta yuklanadi ─────────────────────────────────
 * Savatda faqat mahsulot ID'si va soni saqlanadi. Nom, narx va ZAXIRA
 * bu yerda bazadan olinadi — ya'ni foydalanuvchi doim joriy holatni
 * ko'radi. Savatga qo'shgandan keyin mahsulot tugab qolgan bo'lsa,
 * buni tasdiqlashdan OLDIN ko'rsatamiz.
 *
 * Yakuniy summa baribir SERVERDA qayta hisoblanadi.
 */
export function MarketCartContent() {
  const router = useRouter();
  const request = useApiClient();
  const cart = useMarketCart();

  const [addressId, setAddressId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shop = useApiQuery<ShopResponse>(
    cart.isReady && cart.shopSlug ? `/api/v1/market/shops/${cart.shopSlug}` : null,
  );
  const addresses = useApiQuery<AddressesResponse>('/api/v1/addresses');
  const wallet = useApiQuery<WalletSummary>('/api/v1/wallet');

  /**
   * Narx va zaxira SAVAT SO'ROVIDA keladi.
   *
   * ── Nima uchun alohida "preview" so'rovi yo'q ───────────────────────
   * Savat brauzerda turganda server undagi mahsulotlarni bilmasdi:
   * ularni yuborib, narxini alohida so'rash kerak edi.
   *
   * 45-bosqichdan keyin savat serverning o'zida. U narxni ham,
   * zaxirani ham bir so'rovda qaytaradi va ikkinchi so'rov
   * keraksiz bo'lib qoldi.
   */
  const lines = cart.cart.lines.map((line) => ({ ...line, price: line.unitPrice }));

  const savedLines = cart.cart.savedLines;

  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const deliveryFee = shop.data?.shop.deliveryFee ?? 0;
  const minOrder = shop.data?.shop.minOrder ?? 0;
  const total = subtotal + deliveryFee;

  const addressList = addresses.data?.addresses ?? [];
  const selectedAddressId =
    addressId ?? addressList.find((address) => address.isDefault)?.id ?? addressList[0]?.id ?? null;

  const balance = wallet.data?.available ?? 0;
  const isBelowMinimum = subtotal > 0 && subtotal < minOrder;
  /** Zaxira yetmaydigan qatorlar — tasdiqlashdan oldin ko'rsatiladi. */
  const shortLines = lines.filter((line) => line.quantity > line.stock);
  const hasEnoughMoney = balance >= total;

  const canSubmit =
    lines.length > 0 &&
    !isBelowMinimum &&
    shortLines.length === 0 &&
    hasEnoughMoney &&
    /*
      Yopiq do'kondan buyurtma berib bo'lmaydi — buni SERVER ham
      rad etadi. Lekin odam buni manzil tanlab, izoh yozib
      bo'lgandan keyin emas, DARHOL bilishi kerak.
    */
    cart.cart.shop?.isOpen !== false &&
    selectedAddressId !== null;

  async function submit() {
    if (!cart.shopId || !selectedAddressId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await request<MarketOrderResponse>('/api/v1/market/orders', {
        method: 'POST',
        body: {
          shopId: cart.shopId,
          addressId: selectedAddressId,
          items: cart.lines,
          ...(note.trim() ? { deliveryNote: note.trim() } : {}),
          idempotencyKey: createIdempotencyKey(),
        },
      });

      /*
        Savatni SERVER buyurtma amaliyoti ichida bo'shatdi.

        Bu yerda faqat brauzerdagi nusxa tozalanadi — aks holda
        buyurtma berilgandan keyin ham to'la savat ko'rinardi.
      */
      resetCartState();
      router.push(`/marketplace/orders/${response.order.id}`);
    } catch (caught) {
      setError(toUserMessage(caught));
      setIsSubmitting(false);
    }
  }

  const isLoading = !cart.isReady || (cart.shopSlug !== null && shop.isLoading);

  const isShopClosed = cart.cart.shop !== null && !cart.cart.shop.isOpen;

  return (
    <>
      <AppHeader
        title="Savat"
        showBack
        backHref={cart.shopSlug ? `/marketplace/s/${cart.shopSlug}` : '/marketplace'}
      />

      <div className="px-4 pt-4 pb-4">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        )}

        {!isLoading && lines.length === 0 && (
          <EmptyState
            icon={ShoppingCart}
            title="Savat bo'sh"
            description="Katalogdan mahsulot tanlang va savatga qo'shing."
            action={
              <Button asChild>
                <Link href="/marketplace">Katalogni ochish</Link>
              </Button>
            }
          />
        )}

        {!isLoading && lines.length > 0 && (
          <>
            <p className="text-muted-foreground mb-3 text-sm">{cart.shopName}</p>

            <ul className="space-y-2">
              {lines.map((line) => {
                const isShort = line.quantity > line.stock;

                return (
                  <li
                    key={cartLineKey(line.productId, line.variantId)}
                    className={cn(
                      'bg-card border-border flex items-center gap-3 rounded-2xl border p-3',
                      isShort && 'border-destructive/40',
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <Link href={`/marketplace/p/${line.slug}`} className="line-clamp-2 text-sm font-medium">
                        {line.name}
                      </Link>

                      {/* Variant nomi — "Qora · 256 GB". */}
                      {line.variantLabel && (
                        <p className="text-muted-foreground text-xs">{line.variantLabel}</p>
                      )}
                      <p className="text-muted-foreground text-xs tabular-nums">
                        {`${formatTiyin(line.price)} × ${line.quantity} = ${formatTiyin(line.price * line.quantity)}`}
                      </p>
                      {!line.isAvailable && (
                        <p className="text-destructive mt-1 text-xs">
                          Bu variant endi sotuvda yo&apos;q. Savatdan olib tashlang.
                        </p>
                      )}

                      {line.isAvailable && isShort && (
                        <p className="text-destructive mt-1 text-xs">
                          {line.stock === 0 ? 'Tugadi' : `Atigi ${line.stock} ta qolgan`}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <QuantityStepper
                        value={line.quantity}
                        max={Math.min(line.stock, MAX_ITEM_QUANTITY)}
                        onChange={(next) => cart.setQuantity(line.productId, next, line.variantId)}
                        label={line.name}
                      />

                      {/*
                        "Keyinroq" — o'chirishga MUQOBIL.

                        Odam ko'pincha mahsulotni butunlay rad
                        etmaydi: u shunchaki bu safar olmaydi.
                        Faqat "o'chirish" tugmasi bo'lsa, u
                        mahsulotni yo'qotardi va keyin qaytadan
                        qidirishga majbur bo'lardi.
                      */}
                      <button
                        type="button"
                        onClick={() => cart.saveForLater(line.productId, line.variantId)}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
                      >
                        <Bookmark className="size-3.5" aria-hidden="true" />
                        Keyinroq
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Manzil */}
            <section className="mt-5">
              <h2 className="mb-2 text-sm font-semibold">Yetkazish manzili</h2>

              {addressList.length === 0 ? (
                <Alert variant="warning" title="Manzil yo'q">
                  Buyurtma berish uchun avval manzil qo&apos;shing.{' '}
                  <Link href="/addresses" className="font-medium underline">
                    Manzil qo&apos;shish
                  </Link>
                </Alert>
              ) : (
                <ul className="space-y-2">
                  {addressList.map((address) => (
                    <li key={address.id}>
                      <button
                        type="button"
                        onClick={() => setAddressId(address.id)}
                        aria-pressed={selectedAddressId === address.id}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors',
                          selectedAddressId === address.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card hover:bg-secondary',
                        )}
                      >
                        <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{address.label}</span>
                          <span className="text-muted-foreground block truncate text-xs">
                            {`${address.city}, ${address.street}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Field id="market-note" label="Kuryer uchun izoh" hint="Ixtiyoriy" className="mt-4">
              <Input
                id="market-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Masalan: ish vaqtida qo'ng'iroq qiling"
                maxLength={255}
              />
            </Field>

            {/* Hisob */}
            <dl className="bg-card border-border mt-5 space-y-2 rounded-2xl border p-4 text-sm">
              <div className="flex items-baseline justify-between">
                <dt className="text-muted-foreground">Mahsulotlar</dt>
                <dd className="tabular-nums">{formatTiyin(subtotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-muted-foreground">Yetkazish</dt>
                <dd className="tabular-nums">{formatTiyin(deliveryFee)}</dd>
              </div>
              <div className="border-border/60 flex items-baseline justify-between border-t pt-2 text-base font-semibold">
                <dt>Jami</dt>
                <dd className="tabular-nums">{formatTiyin(total)}</dd>
              </div>
            </dl>

            {/* Ogohlantirishlar */}
            <div className="mt-4 space-y-3">
              {isShopClosed && (
                <Alert variant="warning" title="Do'kon vaqtincha yopiq">
                  {`${cart.shopName} hozir buyurtma qabul qilmayapti. Savatingiz saqlanadi — birozdan keyin qayta urinib ko'ring.`}
                </Alert>
              )}

              {isBelowMinimum && (
                <Alert variant="warning" title="Eng kam buyurtmaga yetmadi">
                  {`${cart.shopName} uchun eng kam buyurtma — ${formatTiyin(minOrder)}. Yana ${formatTiyin(minOrder - subtotal)} lik mahsulot qo'shing.`}
                </Alert>
              )}

              {shortLines.length > 0 && (
                <Alert variant="error" title="Zaxira yetmaydi">
                  {`"${shortLines[0].name}" uchun sonini kamaytiring yoki savatdan olib tashlang.`}
                </Alert>
              )}

              {!hasEnoughMoney && lines.length > 0 && (
                <Alert variant="error" title="Mablag' yetarli emas">
                  <span className="flex items-center gap-1.5">
                    <Wallet className="size-3.5" aria-hidden="true" />
                    {`Hamyonda ${formatTiyin(balance)} bor, kerak ${formatTiyin(total)}.`}
                  </span>
                  <Link href="/wallet/topup" className="mt-1 inline-block font-medium underline">
                    Hisobni to&apos;ldirish
                  </Link>
                </Alert>
              )}

              {error && <Alert variant="error">{error}</Alert>}
            </div>

            <Button
              fullWidth
              size="lg"
              className="mt-4"
              onClick={submit}
              disabled={!canSubmit}
              isLoading={isSubmitting}
              loadingText="Yuborilmoqda..."
            >
              {`${formatTiyin(total)} — buyurtma berish`}
            </Button>
          </>
        )}

        {/*
          "Keyinroq" ro'yxati savat BO'SH bo'lganda ham ko'rinadi.

          Aynan shu holat eng muhimi: odam buyurtma berib bo'lgan
          va endi saqlab qo'ygan narsalariga qaytishi mumkin.
        */}
        {!isLoading && (
          <SavedForLater
            lines={savedLines}
            onMoveToCart={(productId, variantId) => cart.moveToCart(productId, variantId)}
            onRemove={(productId, variantId) => cart.remove(productId, variantId)}
            className={lines.length > 0 ? 'mt-8' : 'mt-6'}
          />
        )}

        {cart.error && (
          <Alert variant="error" className="mt-4">
            {cart.error}
          </Alert>
        )}
      </div>
    </>
  );
}

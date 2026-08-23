'use client';

import {
  BadgeCheck,
  Clock,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShoppingBag,
  Star,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { ServiceIcon } from '@/components/app/service-icon';
import { CatalogThumb } from '@/components/catalog/catalog-thumb';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatTiyin } from '@/lib/money';
import { formatUzPhone } from '@/lib/phone';
import { cn } from '@/lib/utils';
import {
  BUSINESS_KIND_LABELS,
  catalogLabel,
  formatWorkingHours,
  mapsUrl,
  type BusinessFollowResponse,
  type BusinessProfileResponse,
} from '@/modules/business/business.types';
import { formatCount } from '@/modules/profile/social.types';

export interface BusinessProfileContentProps {
  slug: string;
}

/**
 * Restoran va do'konning ommaviy profili.
 *
 * ── Nima uchun bitta sahifa ikkalasiga ────────────────────────────────
 * Ekranda ko'rinadigan narsa deyarli bir xil: nom, reyting, manzil,
 * ish vaqti, katalog va tugmalar. Ikkita sahifa yozilsa, ular
 * bir-biridan asta-sekin uzoqlashib ketardi.
 *
 * Farq faqat NOMLARDA: restoranda "Menyu", do'konda "Mahsulotlar".
 */
export function BusinessProfileContent({ slug }: BusinessProfileContentProps) {
  const request = useApiClient();
  const router = useRouter();

  const { data, isLoading, error, setData } = useApiQuery<BusinessProfileResponse>(`/api/v1/business/${slug}`);

  const [tab, setTab] = useState<'catalog' | 'about'>('catalog');
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const business = data?.business ?? null;

  async function toggleFollow() {
    if (!business) return;

    const wasFollowing = business.isFollowing;

    setIsSaving(true);
    setActionError(null);

    // Darhol ko'rinadigan o'zgarish — server javobini kutmasdan.
    setData((current) =>
      current
        ? {
            business: {
              ...current.business,
              isFollowing: !wasFollowing,
              followerCount: current.business.followerCount + (wasFollowing ? -1 : 1),
            },
          }
        : current!,
    );

    try {
      const result = await request<BusinessFollowResponse>(`/api/v1/business/${business.slug}/follow`, {
        method: wasFollowing ? 'DELETE' : 'POST',
        ...(wasFollowing ? {} : { body: {} }),
      });

      setData((current) => (current ? { business: { ...current.business, ...result } } : current!));
    } catch (caught) {
      // Xato bo'lsa taxminni orqaga qaytaramiz.
      setData((current) =>
        current
          ? {
              business: {
                ...current.business,
                isFollowing: wasFollowing,
                followerCount: current.business.followerCount + (wasFollowing ? 1 : -1),
              },
            }
          : current!,
      );

      setActionError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  /** Biznes bilan suhbatni ochadi (mavjud bo'lsa — o'shani). */
  async function openChat() {
    if (!business) return;

    setIsSaving(true);
    setActionError(null);

    try {
      const result = await request<{ conversationId: string }>('/api/v1/chat/conversations', {
        method: 'POST',
        body: { businessSlug: business.slug },
      });

      // To'g'ridan-to'g'ri suhbat oynasiga — ro'yxatdan izlash shart emas.
      router.push(`/messages/${result.conversationId}`);
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  const KindIcon = business?.kind === 'SHOP' ? Store : UtensilsCrossed;

  return (
    <>
      <AppHeader title="Profil" showBack backHref={business?.kind === 'SHOP' ? '/marketplace' : '/food'} />

      <div className="space-y-4 px-4 pt-4">
        {isLoading && (
          <>
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Profilni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {actionError && <Alert variant="error">{actionError}</Alert>}

        {business && (
          <>
            <section className="bg-card border-border animate-fade-up rounded-2xl border p-5">
              <div className="flex items-start gap-3">
                {/* Rasm bor bo'lsa — rasm; yo'q bo'lsa rangli ikonka. */}
                {business.image ? (
                  <CatalogThumb
                    image={business.image}
                    name={business.name}
                    eager
                    className="size-16 shrink-0 rounded-2xl"
                  />
                ) : (
                  <ServiceIcon icon={KindIcon} color={business.color} size="lg" />
                )}

                <div className="min-w-0 flex-1">
                  <h1 className="flex items-center gap-1.5 text-lg leading-snug font-semibold text-balance">
                    {business.name}
                    {business.isVerified && (
                      <BadgeCheck className="text-primary size-5 shrink-0" aria-label="Tasdiqlangan" />
                    )}
                  </h1>
                  <p className="text-muted-foreground mt-0.5 truncate text-sm">{`@${business.slug}`}</p>
                </div>
              </div>

              {/* Sonlar — maketdagi kabi uch ustun */}
              <div className="border-border/60 mt-4 grid grid-cols-3 gap-2 border-y py-3">
                <div className="text-center">
                  <p className="text-base font-semibold tabular-nums">{formatCount(business.itemCount)}</p>
                  <p className="text-muted-foreground text-xs">{catalogLabel(business.kind)}</p>
                </div>
                <div className="text-center">
                  <p className="text-base font-semibold tabular-nums">{formatCount(business.followerCount)}</p>
                  <p className="text-muted-foreground text-xs">Obunachilar</p>
                </div>
                <div className="text-center">
                  <p className="flex items-center justify-center gap-1 text-base font-semibold tabular-nums">
                    <Star className="size-3.5 fill-current text-amber-500" aria-hidden="true" />
                    {business.rating.toFixed(1)}
                  </p>
                  <p className="text-muted-foreground text-xs">{`${formatCount(business.ratingCount)} sharh`}</p>
                </div>
              </div>

              <p className="mt-3 text-sm leading-relaxed">{business.description}</p>

              <div className="text-muted-foreground mt-3 space-y-1.5 text-xs">
                <p className="flex items-center gap-1.5">
                  <Store className="size-3.5 shrink-0" aria-hidden="true" />
                  {`${BUSINESS_KIND_LABELS[business.kind]} · ${business.city}`}
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                  {formatWorkingHours(business.opensAt, business.closesAt)}
                  {!business.isOpen && <span className="text-destructive ml-1">· hozir yopiq</span>}
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                  {business.address}
                </p>
              </div>

              {/* Asosiy amallar */}
              <div className="mt-4 flex gap-2">
                <Button
                  variant={business.isFollowing ? 'outline' : 'primary'}
                  className="flex-1"
                  isLoading={isSaving}
                  onClick={toggleFollow}
                >
                  {business.isFollowing ? 'Obunani bekor qilish' : "Obuna bo'lish"}
                </Button>

                {/*
                  Xabar chat bilan birga ishga tushadi (PHASE 6).
                  Tugma ko'rinib turadi, lekin bosilmaydi.
                */}
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isSaving}
                  onClick={openChat}
                  aria-label="Xabar yozish"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                </Button>

                {/*
                  Qo'ng'iroq esa HOZIR ishlaydi: telefon raqami bor va
                  `tel:` havolasi telefonning o'z ilovasini ochadi.
                  Ilova ichidagi qo'ng'iroq PHASE 8 da qo'shiladi.
                */}
                {business.phone && (
                  <Button variant="outline" size="icon" asChild aria-label="Telefon qilish">
                    <a href={`tel:${business.phone}`}>
                      <Phone className="size-4" aria-hidden="true" />
                    </a>
                  </Button>
                )}
              </div>

              {/* Tezkor amallar — maketdagi to'rtta yumaloq tugma */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                <QuickAction
                  href={business.orderUrl}
                  icon={business.kind === 'SHOP' ? ShoppingBag : UtensilsCrossed}
                  label={catalogLabel(business.kind)}
                />
                <QuickAction href={business.orderUrl} icon={ShoppingBag} label="Buyurtma" />
                <QuickAction
                  href={mapsUrl(business.city, business.address)}
                  icon={Navigation}
                  label="Manzil"
                  isExternal
                />
                {business.phone ? (
                  <QuickAction href={`tel:${business.phone}`} icon={Phone} label="Aloqa" isExternal />
                ) : (
                  <span />
                )}
              </div>
            </section>

            {/* Bo'limlar */}
            <div className="flex gap-2">
              {(
                [
                  ['catalog', catalogLabel(business.kind)],
                  ['about', "Ma'lumot"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  aria-pressed={tab === value}
                  className={cn(
                    'flex-1 rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                    tab === value
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-secondary',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === 'catalog' && (
              <section className="space-y-2">
                {business.items.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    {`${catalogLabel(business.kind)} hozircha bo'sh.`}
                  </p>
                ) : (
                  business.items.map((item) => (
                    <div key={item.id} className="bg-card border-border rounded-2xl border p-4">
                      <div className="flex items-start justify-between gap-3">
                        {item.image && (
                          <CatalogThumb
                            image={item.image}
                            name={item.name}
                            className="size-14 shrink-0 rounded-xl"
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{item.name}</p>
                          {item.categoryName && (
                            <p className="text-muted-foreground mt-0.5 text-xs">{item.categoryName}</p>
                          )}
                          {item.description && (
                            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <span className="shrink-0 font-semibold tabular-nums">{formatTiyin(item.priceTiyin)}</span>
                      </div>
                    </div>
                  ))
                )}

                <Button variant="outline" fullWidth asChild>
                  <Link href={business.orderUrl}>Buyurtma berish</Link>
                </Button>
              </section>
            )}

            {tab === 'about' && (
              <section className="bg-card border-border rounded-2xl border p-4">
                {business.about && <p className="text-sm leading-relaxed">{business.about}</p>}

                <dl className="border-border/60 mt-4 space-y-3 border-t pt-4 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Turi</dt>
                    <dd>{BUSINESS_KIND_LABELS[business.kind]}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Ish vaqti</dt>
                    <dd className="tabular-nums">{formatWorkingHours(business.opensAt, business.closesAt)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Manzil</dt>
                    <dd className="text-right">{`${business.city}, ${business.address}`}</dd>
                  </div>
                  {business.phone && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Telefon</dt>
                      <dd>
                        <a href={`tel:${business.phone}`} className="text-primary tabular-nums">
                          {formatUzPhone(business.phone)}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            <p className="text-muted-foreground px-1 pb-2 text-center text-xs leading-relaxed">
              Suhbat oynasi va ilova ichidagi qo&apos;ng&apos;iroq keyingi bosqichlarda qo&apos;shiladi.
            </p>
          </>
        )}
      </div>
    </>
  );
}

interface QuickActionProps {
  href: string;
  icon: typeof Phone;
  label: string;
  /** Tashqi havola (telefon yoki xarita) — yangi oynada ochiladi. */
  isExternal?: boolean;
}

/** Maketdagi yumaloq tezkor tugma. */
function QuickAction({ href, icon: Icon, label, isExternal = false }: QuickActionProps) {
  const content = (
    <>
      <span className="bg-secondary text-foreground inline-flex size-12 items-center justify-center rounded-full">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </>
  );

  const className = 'flex flex-col items-center gap-1.5 transition-transform active:scale-95';

  return isExternal ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

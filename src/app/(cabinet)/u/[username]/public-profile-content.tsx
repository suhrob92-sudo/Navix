'use client';

import {
  BadgeCheck,
  Ban,
  Flag,
  Globe,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Settings2,
  UserPlus,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { UserPosts } from '@/components/feed/user-posts';
import { ReportDialog } from '@/components/moderation/report-dialog';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { CollabOfferDialog } from '@/components/collab/collab-offer-dialog';
import { CreatorLinks } from '@/components/profile/creator-links';
import { toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { formatUzDate } from '@/lib/date';
import { useCall } from '@/modules/call/call-provider';
import type { CallKindName } from '@/modules/call/call.types';
import type { BlockResponse, ReportReasonName } from '@/modules/moderation/moderation.types';
import {
  formatCount,
  formatUsername,
  formatWebsite,
  type FollowResponse,
  type PublicProfileResponse,
} from '@/modules/profile/social.types';

export interface PublicProfileContentProps {
  username: string;
}

/**
 * Ommaviy profil.
 *
 * ── Nima uchun obunachilar soni MAHALLIY holatda ham saqlanadi ────────
 * "Kuzatish" bosilganda son darhol o'zgarishi kerak. Serverdan javob
 * kutilsa, tugma bosilgandan keyin bir soniya hech narsa o'zgarmasdi
 * va odam ikkinchi marta bosardi.
 *
 * Server javobi kelgach son ANIQ qiymatga almashtiriladi — shunda
 * mahalliy taxmin bilan haqiqat ajralib qolmaydi.
 */
export function PublicProfileContent({ username }: PublicProfileContentProps) {
  const request = useApiClient();
  const router = useRouter();
  const call = useCall();

  const { data, isLoading, error, setData } = useApiQuery<PublicProfileResponse>(`/api/v1/users/${username}`);

  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBlockOpen, setIsBlockOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  /** Hamkorlik taklifi oynasi ochiqmi. */
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const profile = data?.profile ?? null;

  async function toggleFollow() {
    if (!profile) return;

    const wasFollowing = profile.isFollowing;

    setIsSaving(true);
    setActionError(null);

    // Darhol ko'rinadigan o'zgarish.
    setData((current) =>
      current
        ? {
            profile: {
              ...current.profile,
              isFollowing: !wasFollowing,
              followerCount: current.profile.followerCount + (wasFollowing ? -1 : 1),
            },
          }
        : current!,
    );

    try {
      const result = await request<FollowResponse>(`/api/v1/users/${profile.username}/follow`, {
        method: wasFollowing ? 'DELETE' : 'POST',
        ...(wasFollowing ? {} : { body: {} }),
      });

      setData((current) =>
        current
          ? {
              profile: {
                ...current.profile,
                isFollowing: result.isFollowing,
                followerCount: result.followerCount,
              },
            }
          : current!,
      );
    } catch (caught) {
      // Xato bo'lsa taxminni ORQAGA qaytaramiz.
      setData((current) =>
        current
          ? {
              profile: {
                ...current.profile,
                isFollowing: wasFollowing,
                followerCount: current.profile.followerCount + (wasFollowing ? 1 : -1),
              },
            }
          : current!,
      );

      setActionError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Suhbatni ochadi.
   *
   * Server mavjud suhbatni qaytaradi yoki yangisini yaratadi —
   * shuning uchun bu yerda "bormi?" degan tekshiruv yo'q.
   */
  async function openChat() {
    if (!profile) return;

    setIsSaving(true);
    setActionError(null);

    try {
      const result = await request<{ conversationId: string }>('/api/v1/chat/conversations', {
        method: 'POST',
        body: { username: profile.username },
      });

      // To'g'ridan-to'g'ri suhbat oynasiga — ro'yxatdan izlash shart emas.
      router.push(`/messages/${result.conversationId}`);
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Profildan to'g'ridan-to'g'ri qo'ng'iroq qiladi.
   *
   * ── Nima uchun avval SUHBAT ochiladi ─────────────────────────────────
   * Qo'ng'iroq har doim biror suhbatga tegishli: uning izi o'sha
   * suhbat tarixida qoladi ("javobsiz qo'ng'iroq"). Suhbat hali
   * bo'lmasa, server uni shu yerda yaratadi.
   *
   * Odam buni sezmaydi — u faqat qo'ng'iroq tugmasini bosadi.
   */
  async function startCall(kind: CallKindName) {
    if (!profile) return;

    setIsSaving(true);
    setActionError(null);

    try {
      const result = await request<{ conversationId: string }>('/api/v1/chat/conversations', {
        method: 'POST',
        body: { username: profile.username },
      });

      await call.start(result.conversationId, kind);
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Bloklaydi yoki blokdan chiqaradi.
   *
   * ── Nima uchun bloklashda OBUNA ham yo'qoladi ────────────────────────
   * Server bloklashda ikki tomonlama obunani uzadi. Shuning uchun bu
   * yerda `isFollowing` ham `false` ga o'tkaziladi — aks holda ekranda
   * "Obunani bekor qilish" tugmasi qolib, haqiqatga to'g'ri kelmasdi.
   */
  async function toggleBlock() {
    if (!profile) return;

    const wasBlocked = profile.isBlocked;

    setIsSaving(true);
    setActionError(null);

    try {
      const result = await request<BlockResponse>(`/api/v1/users/${profile.username}/block`, {
        method: wasBlocked ? 'DELETE' : 'POST',
        ...(wasBlocked ? {} : { body: {} }),
      });

      setData((current) =>
        current
          ? {
              profile: {
                ...current.profile,
                isBlocked: result.isBlocked,
                ...(result.isBlocked ? { isFollowing: false } : {}),
              },
            }
          : current!,
      );

      setIsBlockOpen(false);
      setIsMenuOpen(false);
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  async function sendReport(reason: ReportReasonName, note: string) {
    if (!profile) return;

    setIsSaving(true);
    setActionError(null);

    try {
      await request(`/api/v1/users/${profile.username}/report`, {
        method: 'POST',
        body: { reason, ...(note ? { note } : {}) },
      });

      setIsReportOpen(false);
      setIsMenuOpen(false);
      setReportSent(true);
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <AppHeader title="Profil" showBack backHref="/dashboard" />

      <div className="space-y-4 px-4 pt-4">
        {isLoading && (
          <>
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Profilni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {actionError && <Alert variant="error">{actionError}</Alert>}

        {reportSent && (
          <Alert variant="success" title="Shikoyat yuborildi">
            Moderator uni ko&apos;rib chiqadi. Xohlasangiz bu odamni bloklab ham qo&apos;yishingiz mumkin.
          </Alert>
        )}

        {profile?.isBlocked && (
          <Alert variant="warning" title="Bu foydalanuvchi bloklangan">
            U sizga yoza olmaydi va qo&apos;ng&apos;iroq qila olmaydi. Siz ham unga yoza olmaysiz.
          </Alert>
        )}

        {profile && (
          <>
            <section className="bg-card border-border animate-fade-up relative rounded-2xl border p-5">
              {!profile.isOwn && (
                <div className="absolute top-3 right-3 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Boshqa amallar"
                    aria-expanded={isMenuOpen}
                    onClick={() => setIsMenuOpen((current) => !current)}
                  >
                    <MoreHorizontal className="size-5" aria-hidden="true" />
                  </Button>

                  {isMenuOpen && (
                    <>
                      {/*
                        Ko'rinmas "orqa fon": menyudan tashqariga bosilganda
                        u yopiladi. Hujjatga hodisa tinglovchisi qo'shish
                        ham mumkin edi, lekin u sahifadan chiqishda
                        tozalanishi kerak va oson unutiladi.
                      */}
                      <button
                        type="button"
                        aria-label="Menyuni yopish"
                        className="fixed inset-0 z-10 cursor-default"
                        onClick={() => setIsMenuOpen(false)}
                      />

                      <div
                        role="menu"
                        /*
                          Fon SHAFFOF emas: menyu avatar ustida ochiladi
                          va shaffof fonda matn o'qib bo'lmasdi.
                        */
                        className="bg-card border-border animate-scale-in absolute top-full right-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border p-1 shadow-xl"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          disabled={isSaving}
                          className="hover:bg-secondary flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-60"
                          onClick={() => {
                            setIsMenuOpen(false);
                            setIsReportOpen(true);
                          }}
                        >
                          <Flag className="size-4 shrink-0" aria-hidden="true" />
                          Shikoyat qilish
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          disabled={isSaving}
                          className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-60"
                          onClick={() => {
                            if (profile.isBlocked) {
                              void toggleBlock();
                              return;
                            }

                            setIsMenuOpen(false);
                            setIsBlockOpen(true);
                          }}
                        >
                          <Ban className="size-4 shrink-0" aria-hidden="true" />
                          {profile.isBlocked ? 'Blokdan chiqarish' : 'Bloklash'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-col items-center text-center">
                <Avatar src={profile.avatarUrl} name={profile.fullName} size="xl" />

                <h1 className="mt-3 flex items-center gap-1.5 text-xl font-semibold tracking-tight text-balance">
                  {profile.fullName ?? formatUsername(profile.username)}
                  {profile.isVerified && (
                    <BadgeCheck className="text-primary size-5 shrink-0" aria-label="Tasdiqlangan profil" />
                  )}
                </h1>

                <p className="text-muted-foreground text-sm">{formatUsername(profile.username)}</p>

                {profile.bio && (
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-balance">{profile.bio}</p>
                )}

                <div className="text-muted-foreground mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
                  {profile.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                      {profile.location}
                    </span>
                  )}

                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      /*
                        `noopener` shart: usiz ochilgan sayt bizning
                        oynamizni boshqa manzilga yo'naltira olardi.
                        `nofollow` — begona saytga ishonch bermaslik uchun.
                      */
                      rel="noopener noreferrer nofollow"
                      className="text-primary flex items-center gap-1 hover:underline"
                    >
                      <Globe className="size-3.5 shrink-0" aria-hidden="true" />
                      {formatWebsite(profile.website)}
                    </a>
                  )}

                  <span>{`${formatUzDate(profile.joinedAt, 'long')} dan beri`}</span>
                </div>
              </div>

              {/*
                Tarmoqlar va hamkorlik holati.

                Sonlardan YUQORIDA: odam avval "bu kim va u bilan
                bog'lanish mumkinmi?" degan savolga javob izlaydi,
                keyin raqamlarga qaraydi.
              */}
              <CreatorLinks
                links={profile.links}
                isOpenToCollab={profile.isOpenToCollab}
                collabNote={profile.collabNote}
                {...(profile.isOwn || profile.isBlocked
                  ? {}
                  : { onOffer: () => setIsOfferOpen(true) })}
              />

              {/*
                Sonlar.

                ── Nima uchun KO'RISHLAR ham ko'rsatiladi ────────────
                Obunachilar soni — "menga nechta odam obuna bo'lgan".
                Ko'rishlar esa "ishim nechta odamga yetib bordi".
                Ikkinchisi ijodkor uchun ancha muhimroq: obunachisiz
                ham million ko'rish bo'lishi mumkin.

                Ko'rish bo'lmasa ustun CHIZILMAYDI — nol raqam
                yangi odamni ruhlantirmaydi.
              */}
              <div
                className={cn(
                  'border-border/60 mt-5 grid gap-3 border-t pt-4',
                  profile.videoViewCount > 0 ? 'grid-cols-3' : 'grid-cols-2',
                )}
              >
                <div className="text-center">
                  <p className="text-lg font-semibold tabular-nums">{formatCount(profile.followerCount)}</p>
                  <p className="text-muted-foreground text-xs">Obunachilar</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold tabular-nums">{formatCount(profile.followingCount)}</p>
                  <p className="text-muted-foreground text-xs">Obunalari</p>
                </div>

                {profile.videoViewCount > 0 && (
                  <div className="text-center">
                    <p className="text-lg font-semibold tabular-nums">
                      {formatCount(profile.videoViewCount)}
                    </p>
                    <p className="text-muted-foreground text-xs">Ko&apos;rishlar</p>
                  </div>
                )}
              </div>

              {/* Amallar */}
              <div className="mt-4 flex gap-2">
                {profile.isOwn ? (
                  <Button variant="outline" fullWidth asChild>
                    <Link href="/profile">
                      <Settings2 className="size-4" aria-hidden="true" />
                      Profilni tahrirlash
                    </Link>
                  </Button>
                ) : profile.isBlocked ? (
                  /*
                    Bloklangan odam bilan yagona mumkin amal — blokdan
                    chiqarish. Xabar va qo'ng'iroq tugmalari qoldirilsa,
                    ular bosilganda serverdan xato kelardi: ko'rinib
                    turgan, lekin ishlamaydigan tugma.
                  */
                  <Button variant="outline" fullWidth isLoading={isSaving} onClick={() => void toggleBlock()}>
                    <Ban className="size-4" aria-hidden="true" />
                    Blokdan chiqarish
                  </Button>
                ) : (
                  <>
                    <Button
                      variant={profile.isFollowing ? 'outline' : 'primary'}
                      className="flex-1"
                      isLoading={isSaving}
                      onClick={toggleFollow}
                    >
                      {!profile.isFollowing && <UserPlus className="size-4" aria-hidden="true" />}
                      {profile.isFollowing ? 'Obunani bekor qilish' : 'Kuzatish'}
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      disabled={isSaving}
                      onClick={openChat}
                      aria-label="Xabar yozish"
                    >
                      <MessageCircle className="size-4" aria-hidden="true" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      disabled={isSaving}
                      onClick={() => void startCall('AUDIO')}
                      aria-label="Ovozli qo'ng'iroq"
                    >
                      <Phone className="size-4" aria-hidden="true" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      disabled={isSaving}
                      onClick={() => void startCall('VIDEO')}
                      aria-label="Video qo'ng'iroq"
                    >
                      <Video className="size-4" aria-hidden="true" />
                    </Button>
                  </>
                )}
              </div>
            </section>

            {/*
              Bloklangan odamning postlari ko'rsatilmaydi: server ham
              ularni bermaydi va so'rov faqat xato bilan tugardi.
            */}
            {!profile.isBlocked && <UserPosts username={profile.username} isOwn={profile.isOwn} />}

            <ConfirmDialog
              open={isBlockOpen}
              title="Bloklansinmi?"
              description={`${profile.fullName ?? formatUsername(profile.username)} sizga xabar yoza olmaydi va qo'ng'iroq qila olmaydi. Ikkalangizning obunangiz ham bekor qilinadi. Buni istalgan vaqtda qaytarib olishingiz mumkin.`}
              confirmLabel="Bloklash"
              isDestructive
              isLoading={isSaving}
              onConfirm={() => void toggleBlock()}
              onCancel={() => setIsBlockOpen(false)}
            />

            {isOfferOpen && (
              <CollabOfferDialog
                username={profile.username}
                name={profile.fullName ?? formatUsername(profile.username)}
                onClose={() => setIsOfferOpen(false)}
              />
            )}

            {isReportOpen && (
              <ReportDialog
                subject={profile.fullName ?? formatUsername(profile.username)}
                isLoading={isSaving}
                onSubmit={(reason, note) => void sendReport(reason, note)}
                onCancel={() => setIsReportOpen(false)}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

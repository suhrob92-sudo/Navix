'use client';

import { BadgeCheck, Globe, MapPin, MessageCircle, Phone, Settings2, UserPlus, Video } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDate } from '@/lib/date';
import { useCall } from '@/modules/call/call-provider';
import type { CallKindName } from '@/modules/call/call.types';
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

        {profile && (
          <>
            <section className="bg-card border-border animate-fade-up rounded-2xl border p-5">
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

              {/* Sonlar */}
              <div className="border-border/60 mt-5 grid grid-cols-2 gap-3 border-t pt-4">
                <div className="text-center">
                  <p className="text-lg font-semibold tabular-nums">{formatCount(profile.followerCount)}</p>
                  <p className="text-muted-foreground text-xs">Obunachilar</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold tabular-nums">{formatCount(profile.followingCount)}</p>
                  <p className="text-muted-foreground text-xs">Obunalari</p>
                </div>
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
          </>
        )}
      </div>
    </>
  );
}

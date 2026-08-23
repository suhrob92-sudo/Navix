'use client';

import {
  BadgeCheck,
  Copy,
  Link2,
  Link2Off,
  LogOut,
  Pencil,
  RefreshCw,
  Share2,
  ShieldCheck,
  ShieldMinus,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { GroupImagePicker } from '@/components/chat/group-image-picker';
import { UserPicker } from '@/components/chat/user-picker';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { GROUP_ADD_BATCH_MAX, GROUP_TITLE_MAX, groupRoleLabel, memberCountText } from '@/config/group-chat';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatUzDate } from '@/lib/date';
import { GROUP_INVITE_WARNING, groupInviteShareText } from '@/config/group-invite';
import type { GroupInviteResponse } from '@/modules/chat/group-invite.types';
import type { GroupInfoResponse, GroupInfoView, GroupMemberView } from '@/modules/chat/group.types';
import type { UserSearchResult } from '@/modules/profile/social.types';

/**
 * Guruh ma'lumoti sahifasi.
 *
 * ── Nima uchun tahrirlash SHU YERDA, alohida sahifada emas ────────────
 * Nom va rasmni o'zgartirish — kamdan-kam bajariladigan amal. Uning
 * uchun alohida sahifa yasash har safar ikki marta bosishni talab
 * qilardi. Bu yerda esa "Tahrirlash" tugmasi shu joyning o'zida
 * maydonlarni ochadi.
 */
export function GroupInfoContent({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const request = useApiClient();

  const { data, isLoading, error, setData } = useApiQuery<GroupInfoResponse>(
    `/api/v1/chat/groups/${conversationId}`,
  );

  const group = data?.group ?? null;

  /**
   * Havola FAQAT huquqi borlarga so'raladi.
   *
   * Oddiy a'zoga so'rov yuborilsa, server 403 qaytarardi va ekranda
   * sababsiz xato ko'rinardi.
   */
  const canManageInvite = group?.canAddMembers === true || group?.myRole === 'OWNER' || group?.myRole === 'ADMIN';

  const inviteQuery = useApiQuery<GroupInviteResponse>(
    canManageInvite ? `/api/v1/chat/groups/${conversationId}/invite` : null,
  );

  const invite = inviteQuery.data?.invite ?? null;

  const [actionError, setActionError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  // Nom va rasmni tahrirlash.
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [imageDraft, setImageDraft] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // A'zo qo'shish.
  const [isAdding, setIsAdding] = useState(false);
  const [picked, setPicked] = useState<UserSearchResult[]>([]);
  const [isSavingMembers, setIsSavingMembers] = useState(false);

  // Havola.
  const [isInviteBusy, setIsInviteBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // Chiqarish va chiqish tasdiqlari.
  const [removeTarget, setRemoveTarget] = useState<GroupMemberView | null>(null);
  const [isLeaveOpen, setIsLeaveOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  function applyGroup(next: GroupInfoView): void {
    setData({ group: next });
  }

  function startEditing(current: GroupInfoView): void {
    setTitleDraft(current.title);
    setImageDraft(current.imageUrl);
    setActionError(null);
    setIsEditing(true);
  }

  async function saveInfo(event: React.FormEvent): Promise<void> {
    event.preventDefault();

    if (!group) return;

    const title = titleDraft.trim();

    if (title.length < 2) return;

    setIsSavingInfo(true);
    setActionError(null);

    try {
      const result = await request<GroupInfoResponse>(`/api/v1/chat/groups/${conversationId}`, {
        method: 'PATCH',
        body: { title, imageUrl: imageDraft },
      });

      applyGroup(result.group);
      setIsEditing(false);
      /**
       * Sarlavha suhbat oynasida ham ko'rinadi, shuning uchun serverdan
       * olingan ma'lumot yangilanishi kerak.
       */
      router.refresh();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsSavingInfo(false);
    }
  }

  async function addMembers(): Promise<void> {
    if (picked.length === 0) return;

    setIsSavingMembers(true);
    setActionError(null);

    try {
      const result = await request<{ added: number; skipped: number; group: GroupInfoView }>(
        `/api/v1/chat/groups/${conversationId}/members`,
        { method: 'POST', body: { memberIds: picked.map((user) => user.id) } },
      );

      applyGroup(result.group);
      setPicked([]);
      setIsAdding(false);

      /**
       * O'tkazib yuborilganlar haqida ochiq aytiladi.
       *
       * Jimgina o'tkazib yuborilsa, odam tanlagan besh kishidan
       * uchtasi qo'shilganini ko'rib, sababini bilmasdi.
       */
      if (result.skipped > 0) {
        setActionError(`${result.skipped} ta odam qo'shilmadi: ular allaqachon guruhda yoki sizni bloklagan.`);
      }
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsSavingMembers(false);
    }
  }

  /** Havola yasaydi yoki yangilaydi. */
  async function refreshInvite(): Promise<void> {
    setIsInviteBusy(true);
    setActionError(null);

    try {
      const result = await request<GroupInviteResponse>(`/api/v1/chat/groups/${conversationId}/invite`, {
        method: 'POST',
        body: {},
      });

      inviteQuery.setData({ invite: result.invite });
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsInviteBusy(false);
    }
  }

  /** Havolani o'chiradi. */
  async function revokeInvite(): Promise<void> {
    setIsInviteBusy(true);
    setActionError(null);

    try {
      const result = await request<GroupInviteResponse>(`/api/v1/chat/groups/${conversationId}/invite`, {
        method: 'DELETE',
      });

      inviteQuery.setData({ invite: result.invite });
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsInviteBusy(false);
    }
  }

  /**
   * Havolani ulashadi.
   *
   * Telefonda tizimning o'z ulashish oynasi ochiladi, kompyuterda
   * esa havola nusxalanadi — u yerda ulashish oynasi yo'q.
   */
  async function shareInvite(link: string, title: string): Promise<void> {
    const text = groupInviteShareText(title, link);

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: link });
        return;
      }

      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      /*
        Odam ulashish oynasini yopdi yoki nusxalashga ruxsat yo'q.
        Ikkalasi ham xato emas — havola ekranda turibdi, uni qo'lda
        belgilab olsa bo'ladi.
      */
    }
  }

  async function toggleAdmin(member: GroupMemberView): Promise<void> {
    setBusyUserId(member.userId);
    setActionError(null);

    try {
      const result = await request<GroupInfoResponse>(
        `/api/v1/chat/groups/${conversationId}/members/${member.userId}`,
        { method: 'PATCH', body: { isAdmin: member.role !== 'ADMIN' } },
      );

      applyGroup(result.group);
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setBusyUserId(null);
    }
  }

  async function confirmRemove(): Promise<void> {
    if (!removeTarget) return;

    const target = removeTarget;

    setBusyUserId(target.userId);
    setActionError(null);

    try {
      const result = await request<GroupInfoResponse>(
        `/api/v1/chat/groups/${conversationId}/members/${target.userId}`,
        { method: 'DELETE' },
      );

      applyGroup(result.group);
      setRemoveTarget(null);
    } catch (caught) {
      setActionError(toUserMessage(caught));
      setRemoveTarget(null);
    } finally {
      setBusyUserId(null);
    }
  }

  async function confirmLeave(): Promise<void> {
    setIsLeaving(true);
    setActionError(null);

    try {
      await request(`/api/v1/chat/groups/${conversationId}/leave`, { method: 'POST' });

      /**
       * Guruhdan chiqqandan keyin suhbat oynasiga EMAS, ro'yxatga
       * qaytiladi: chiqqan odam uchun u suhbat endi mavjud emas.
       */
      router.replace('/messages');
    } catch (caught) {
      setActionError(toUserMessage(caught));
      setIsLeaving(false);
      setIsLeaveOpen(false);
    }
  }

  return (
    <>
      <AppHeader title="Guruh ma'lumoti" showBack backHref={`/messages/${conversationId}`} />

      <div className="space-y-6 px-4 pt-6 pb-8">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="mx-auto size-24 rounded-full" />
            <Skeleton className="mx-auto h-6 w-40 rounded-lg" />
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-16 rounded-2xl" />
              ))}
            </div>
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Guruhni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {group && (
          <>
            {isEditing ? (
              <form onSubmit={saveInfo} className="space-y-5">
                <GroupImagePicker
                  value={imageDraft}
                  onChange={setImageDraft}
                  name={titleDraft}
                  disabled={isSavingInfo}
                  onUploadingChange={setIsUploading}
                />

                <Field id="group-title" label="Guruh nomi" required>
                  <Input
                    id="group-title"
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    maxLength={GROUP_TITLE_MAX}
                    autoComplete="off"
                    disabled={isSavingInfo}
                  />
                </Field>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={titleDraft.trim().length < 2 || isUploading}
                    isLoading={isSavingInfo}
                    loadingText="Saqlanmoqda..."
                  >
                    Saqlash
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={isSavingInfo}
                  >
                    Bekor qilish
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center">
                <Avatar src={group.imageUrl} name={group.title} size="xl" />

                <h1 className="text-xl font-semibold">{group.title}</h1>

                <p className="text-muted-foreground text-sm">
                  {memberCountText(group.memberCount)} · {formatUzDate(group.createdAt)} dan beri
                </p>

                {group.canEditInfo && (
                  <Button variant="outline" size="sm" onClick={() => startEditing(group)}>
                    <Pencil className="size-4" aria-hidden="true" />
                    Tahrirlash
                  </Button>
                )}
              </div>
            )}

            {actionError && <Alert variant="error">{actionError}</Alert>}

            {/*
              Havola bo'limi A'ZOLARDAN OLDIN.

              Guruh yasagan odamning birinchi ishi — odamlarni
              chaqirish. Havola pastda, uzun ro'yxat ostida tursa,
              uni topish uchun varaqlash kerak bo'lardi.
            */}
            {canManageInvite && (
              <section className="border-border space-y-3 rounded-2xl border p-3">
                <h2 className="flex items-center gap-2 font-medium">
                  <Link2 className="text-muted-foreground size-4" aria-hidden="true" />
                  Taklif havolasi
                </h2>

                {inviteQuery.isLoading && <Skeleton className="h-10 rounded-lg" />}

                {!inviteQuery.isLoading && invite?.link && (
                  <>
                    <p className="bg-secondary/60 text-muted-foreground rounded-lg px-3 py-2 font-mono text-xs break-all">
                      {invite.link}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={isInviteBusy}
                        onClick={() => void shareInvite(invite.link!, group.title)}
                      >
                        {copied ? (
                          <Copy className="size-4" aria-hidden="true" />
                        ) : (
                          <Share2 className="size-4" aria-hidden="true" />
                        )}
                        {copied ? 'Nusxalandi' : 'Ulashish'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isInviteBusy}
                        onClick={() => void refreshInvite()}
                      >
                        <RefreshCw className="size-4" aria-hidden="true" />
                        Yangilash
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        disabled={isInviteBusy}
                        onClick={() => void revokeInvite()}
                      >
                        <Link2Off className="size-4" aria-hidden="true" />
                        O&apos;chirish
                      </Button>
                    </div>

                    {/*
                      Ogohlantirish havolaning YONIDA.

                      Uni hujjatga yozib qo'yish yetarli emas: havolani
                      ulashayotgan odam aynan shu daqiqada nima
                      qilayotganini bilishi kerak.
                    */}
                    <p className="text-muted-foreground text-xs leading-relaxed">{GROUP_INVITE_WARNING}</p>
                  </>
                )}

                {!inviteQuery.isLoading && !invite?.link && (
                  <>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Havola yo&apos;q. Uni yasasangiz, havolani bilgan odam guruhga o&apos;zi qo&apos;shila oladi.
                    </p>

                    <Button
                      size="sm"
                      disabled={isInviteBusy}
                      isLoading={isInviteBusy}
                      loadingText="Yasalmoqda..."
                      onClick={() => void refreshInvite()}
                    >
                      <Link2 className="size-4" aria-hidden="true" />
                      Havola yasash
                    </Button>
                  </>
                )}
              </section>
            )}

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-medium">
                  <Users className="text-muted-foreground size-4" aria-hidden="true" />
                  A&apos;zolar
                  <span className="text-muted-foreground text-sm tabular-nums">{group.memberCount}</span>
                </h2>

                {group.canAddMembers && !isAdding && (
                  <Button variant="outline" size="sm" onClick={() => setIsAdding(true)}>
                    <UserPlus className="size-4" aria-hidden="true" />
                    Qo&apos;shish
                  </Button>
                )}
              </div>

              {isAdding && (
                <div className="border-border space-y-3 rounded-2xl border p-3">
                  <UserPicker
                    selected={picked}
                    onChange={setPicked}
                    excludeIds={group.members.map((member) => member.userId)}
                    max={Math.min(GROUP_ADD_BATCH_MAX, group.freeSlots)}
                  />

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="flex-1"
                      disabled={picked.length === 0}
                      isLoading={isSavingMembers}
                      loadingText="Qo'shilmoqda..."
                      onClick={() => void addMembers()}
                    >
                      Qo&apos;shish
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isSavingMembers}
                      onClick={() => {
                        setIsAdding(false);
                        setPicked([]);
                      }}
                    >
                      Bekor qilish
                    </Button>
                  </div>
                </div>
              )}

              <ul className="space-y-1" aria-label="Guruh a'zolari">
                {group.members.map((member) => (
                  <li
                    key={member.userId}
                    className="hover:bg-secondary/50 flex items-center gap-3 rounded-2xl p-2.5 transition-colors"
                  >
                    {member.handle ? (
                      <Link href={`/u/${member.handle}`} aria-label={`${member.name} profili`}>
                        <Avatar src={member.avatarUrl} name={member.name} size="md" />
                      </Link>
                    ) : (
                      <Avatar src={member.avatarUrl} name={member.name} size="md" />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate font-medium">
                          {member.name}
                          {member.isMe && <span className="text-muted-foreground font-normal"> (siz)</span>}
                        </p>
                        {member.isVerified && (
                          <BadgeCheck className="text-primary size-4 shrink-0" aria-label="Tasdiqlangan" />
                        )}
                      </div>

                      <div className="mt-0.5 flex items-center gap-2">
                        {member.handle && (
                          <p className="text-muted-foreground truncate text-sm">@{member.handle}</p>
                        )}
                        {member.role !== 'MEMBER' && (
                          <Badge variant={member.role === 'OWNER' ? 'default' : 'secondary'}>
                            {groupRoleLabel(member.role)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {member.canToggleAdmin && (
                        <button
                          type="button"
                          disabled={busyUserId === member.userId}
                          onClick={() => void toggleAdmin(member)}
                          className="text-muted-foreground hover:text-foreground hover:bg-secondary tap-target flex size-9 items-center justify-center rounded-full transition-colors disabled:opacity-40"
                          aria-label={
                            member.role === 'ADMIN'
                              ? `${member.name} dan administratorlikni olish`
                              : `${member.name} ni administrator qilish`
                          }
                        >
                          {member.role === 'ADMIN' ? (
                            <ShieldMinus className="size-4" aria-hidden="true" />
                          ) : (
                            <ShieldCheck className="size-4" aria-hidden="true" />
                          )}
                        </button>
                      )}

                      {member.canRemove && (
                        <button
                          type="button"
                          disabled={busyUserId === member.userId}
                          onClick={() => setRemoveTarget(member)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 tap-target flex size-9 items-center justify-center rounded-full transition-colors disabled:opacity-40"
                          aria-label={`${member.name} ni guruhdan chiqarish`}
                        >
                          <UserMinus className="size-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <Button variant="outline" className="text-destructive w-full" onClick={() => setIsLeaveOpen(true)}>
              <LogOut className="size-4" aria-hidden="true" />
              Guruhdan chiqish
            </Button>

            {group.myRole === 'OWNER' && group.memberCount > 1 && (
              <p className="text-muted-foreground text-center text-xs leading-relaxed">
                Siz guruh egasisiz. Chiqsangiz, egalik guruhdagi eng uzoq turgan administratorga o&apos;tadi.
              </p>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={removeTarget !== null}
        title="Guruhdan chiqarish"
        description={`${removeTarget?.name ?? ''} guruhdan chiqariladi. Uning eski xabarlari suhbatda qoladi.`}
        confirmLabel="Chiqarish"
        isDestructive
        isLoading={busyUserId !== null}
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={isLeaveOpen}
        title="Guruhdan chiqish"
        description={
          group?.memberCount === 1
            ? "Siz oxirgi a'zosiz — chiqsangiz guruh butunlay o'chiriladi va xabarlar qaytmaydi."
            : "Guruh boshqa a'zolar uchun ochiq qoladi. Qaytish uchun sizni yana qo'shishlari kerak."
        }
        confirmLabel="Chiqish"
        isDestructive
        isLoading={isLeaving}
        onConfirm={() => void confirmLeave()}
        onCancel={() => setIsLeaveOpen(false)}
      />
    </>
  );
}

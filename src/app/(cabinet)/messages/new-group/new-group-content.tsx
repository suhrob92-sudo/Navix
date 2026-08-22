'use client';

import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { GroupImagePicker } from '@/components/chat/group-image-picker';
import { UserPicker } from '@/components/chat/user-picker';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { GROUP_MAX_MEMBERS, GROUP_TITLE_MAX, memberCountText } from '@/config/group-chat';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import type { CreateGroupResponse } from '@/modules/chat/group.types';
import type { UserSearchResult } from '@/modules/profile/social.types';

/**
 * Yangi guruh yaratish.
 *
 * ── Nima uchun BITTA sahifa, ikki qadam emas ──────────────────────────
 * Telegram avval odamlarni tanlatadi, keyin nom so'raydi. Bu ikki
 * ekran degani: odam nom yozayotib "kimni tanlagan edim?" deb orqaga
 * qaytishi kerak bo'ladi.
 *
 * Bu yerda hammasi ko'z oldida: rasm, nom va tanlanganlar qatori bir
 * ekranda turadi.
 */
export function NewGroupContent() {
  const router = useRouter();
  const request = useApiClient();

  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [members, setMembers] = useState<UserSearchResult[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedTitle = title.trim();
  const canSubmit = trimmedTitle.length >= 2 && members.length > 0 && !isUploading && !isSaving;

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();

    if (!canSubmit) return;

    setIsSaving(true);
    setError(null);

    try {
      const result = await request<CreateGroupResponse>('/api/v1/chat/groups', {
        method: 'POST',
        body: {
          title: trimmedTitle,
          imageUrl,
          memberIds: members.map((user) => user.id),
        },
      });

      /**
       * `replace` — `push` emas.
       *
       * Guruh yaratilgandan keyin orqaga bosgan odam yana "yangi
       * guruh" formasiga tushmasligi kerak: u ish tugagan ekran.
       */
      router.replace(`/messages/${result.conversationId}`);
    } catch (caught) {
      setError(toUserMessage(caught));
      setIsSaving(false);
    }
  }

  return (
    <>
      <AppHeader title="Yangi guruh" showBack backHref="/messages" />

      <form onSubmit={submit} className="space-y-6 px-4 pt-6 pb-8">
        <GroupImagePicker
          value={imageUrl}
          onChange={setImageUrl}
          name={trimmedTitle}
          disabled={isSaving}
          onUploadingChange={setIsUploading}
        />

        <Field id="group-title" label="Guruh nomi" required hint={`Eng ko'pi ${GROUP_TITLE_MAX} belgi.`}>
          <Input
            id="group-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={GROUP_TITLE_MAX}
            placeholder="Masalan: Oila"
            autoComplete="off"
            disabled={isSaving}
          />
        </Field>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-medium">A&apos;zolar</h2>
            <span className="text-muted-foreground text-sm tabular-nums">
              {memberCountText(members.length + 1)}
            </span>
          </div>

          <UserPicker
            selected={members}
            onChange={setMembers}
            max={GROUP_MAX_MEMBERS - 1}
            placeholder="Ism yoki @nom bo'yicha qidiring"
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {/*
          Tugma pastda, lekin oynaning ostiga YOPISHTIRILMAGAN:
          qidiruv natijalari ro'yxati uzun bo'lishi mumkin va yopishgan
          tugma ularning oxirgisini doim yopib turardi.
        */}
        <Button
          type="submit"
          className="w-full"
          disabled={!canSubmit}
          isLoading={isSaving}
          loadingText="Yaratilmoqda..."
        >
          <Users className="size-4" aria-hidden="true" />
          Guruh yaratish
        </Button>

        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          Guruhga qo&apos;shilgan odamlar darhol suhbatni ko&apos;radi. Sizni bloklagan odamlar qo&apos;shilmaydi.
        </p>
      </form>
    </>
  );
}

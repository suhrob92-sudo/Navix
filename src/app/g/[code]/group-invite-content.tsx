'use client';

import { ArrowRight, LogIn, Users, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { memberCountText } from '@/config/group-chat';
import { siteConfig } from '@/config/site';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { clearPendingGroupInvite, rememberGroupInvite } from '@/lib/pending-group-invite';
import { useAuth } from '@/modules/auth/auth-context';
import type { GroupInvitePreview, JoinByInviteResult } from '@/modules/chat/group-invite.types';

export interface GroupInviteContentProps {
  code: string;
  /** `null` — havola topilmadi yoki o'chirilgan. */
  preview: GroupInvitePreview | null;
}

/**
 * Guruh havolasi sahifasi.
 *
 * ── Uch xil odam keladi ───────────────────────────────────────────────
 * Ekran uchalasi uchun ham to'g'ri ishlashi kerak:
 *
 *  1. Hisobi bor va kirgan — darhol "Qo'shilish" tugmasini bosadi;
 *  2. Hisobi bor, lekin kirmagan — avval kiradi, keyin qaytadi;
 *  3. Hisobi yo'q — ro'yxatdan o'tadi, keyin qaytadi.
 *
 * Ikkinchi va uchinchi holatda kod brauzerda saqlanadi, aks holda
 * odam ro'yxatdan o'tib bo'lib, qaysi guruhga chaqirilganini
 * unutardi.
 */
export function GroupInviteContent({ code, preview }: GroupInviteContentProps) {
  const router = useRouter();
  const request = useApiClient();
  const { isAuthenticated, isLoading } = useAuth();

  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    /*
      Kod DARHOL saqlanadi.

      Odam bu sahifada darhol qo'shilmasligi mumkin: avval kiradi
      yoki ro'yxatdan o'tadi. Manzildagi kod esa o'sha yo'lda
      yo'qoladi.
    */
    if (preview) rememberGroupInvite(code);
  }, [code, preview]);

  async function join(): Promise<void> {
    setIsJoining(true);
    setError(null);

    try {
      const result = await request<JoinByInviteResult>(`/api/v1/chat/invite/${code}/join`, {
        method: 'POST',
        body: {},
      });

      clearPendingGroupInvite();

      /**
       * `replace` — `push` emas.
       *
       * Guruhga kirgan odam orqaga bosganda yana havola sahifasiga
       * tushmasligi kerak: u ish tugagan ekran.
       */
      router.replace(`/messages/${result.conversationId}`);
    } catch (caught) {
      setError(toUserMessage(caught));
      setIsJoining(false);
    }
  }

  if (!preview) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
        <Alert variant="error" title="Havola ishlamayapti">
          Bu havola o&apos;chirilgan yoki noto&apos;g&apos;ri. Guruh administratoridan yangi havola so&apos;rang.
        </Alert>

        <Button asChild variant="outline" className="mt-6" size="lg" fullWidth>
          <Link href="/">
            Bosh sahifaga
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="flex flex-col items-center text-center">
        <Avatar src={preview.imageUrl} name={preview.title} size="xl" />

        <h1 className="mt-4 text-xl font-semibold tracking-tight">{preview.title}</h1>

        <p className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-sm">
          <Users className="size-4" aria-hidden="true" />
          {memberCountText(preview.memberCount)}
        </p>

        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Sizni ushbu guruh suhbatiga qo&apos;shilishga chaqirishmoqda.
        </p>
      </div>

      {error && (
        <Alert variant="error" className="mt-6">
          {error}
        </Alert>
      )}

      {preview.isFull && (
        <Alert variant="warning" className="mt-6" title="Guruh to'lgan">
          Hozircha yangi a&apos;zo qo&apos;shib bo&apos;lmaydi. Administratordan so&apos;rang.
        </Alert>
      )}

      <div className="mt-8 space-y-2">
        {/*
          Yuklanayotganda tugma KO'RSATILMAYDI.

          `isAuthenticated` dastlab `false` bo'ladi va u aniqlangunga
          qadar "Ro'yxatdan o'tish" tugmasi ko'rinib qolardi — kirgan
          odam esa buni xato deb o'ylardi.
        */}
        {isLoading ? (
          <div className="bg-secondary h-12 animate-pulse rounded-lg" />
        ) : isAuthenticated ? (
          <Button
            size="lg"
            fullWidth
            disabled={preview.isFull}
            isLoading={isJoining}
            loadingText="Qo'shilmoqda..."
            onClick={() => void join()}
          >
            <UserPlus className="size-4" aria-hidden="true" />
            Guruhga qo&apos;shilish
          </Button>
        ) : (
          <>
            <Button asChild size="lg" fullWidth>
              <Link href="/auth/register">
                <UserPlus className="size-4" aria-hidden="true" />
                Ro&apos;yxatdan o&apos;tish
              </Link>
            </Button>

            {/*
              Allaqachon hisobi borlar uchun yo'l.

              Kirgandan keyin odam SHU sahifaga qaytadi va kod
              brauzerda saqlanib turgani uchun guruh o'zgarmaydi.
            */}
            <Button asChild variant="ghost" size="lg" fullWidth>
              <Link href={`/auth/login?next=${encodeURIComponent(`/g/${code}`)}`}>
                <LogIn className="size-4" aria-hidden="true" />
                Hisobim bor — kirish
              </Link>
            </Button>
          </>
        )}
      </div>

      <p className="text-muted-foreground mt-6 text-center text-xs leading-relaxed">
        Qo&apos;shilsangiz, guruh a&apos;zolari sizning ismingiz va rasmingizni ko&apos;radi. {siteConfig.name}{' '}
        guruh suhbatlarini o&apos;qimaydi.
      </p>
    </main>
  );
}

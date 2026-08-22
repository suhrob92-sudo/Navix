'use client';

import { ArrowRight, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { siteConfig } from '@/config/site';
import { rememberReferral } from '@/lib/pending-referral';
import type { ReferralInviterView } from '@/modules/referral/referral.types';

export interface InviteContentProps {
  code: string;
  /** `null` — kod topilmadi yoki egasining hisobi yopilgan. */
  inviter: ReferralInviterView | null;
}

export function InviteContent({ code, inviter }: InviteContentProps) {
  useEffect(() => {
    /*
      Kod DARHOL saqlanadi.

      Odam bu sahifada darhol ro'yxatdan o'tmasligi mumkin: avval
      ilova haqida o'qiydi, boshqa sahifalarni ochadi. Manzildagi
      kod esa birinchi o'tishdayoq yo'qoladi.

      Noto'g'ri kod saqlanmaydi — buni `rememberReferral` o'zi
      tekshiradi.
    */
    if (inviter) rememberReferral(code);
  }, [code, inviter]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      {inviter ? (
        <>
          <div className="flex flex-col items-center text-center">
            <Avatar src={inviter.avatarUrl} name={inviter.name} size="lg" />

            <h1 className="mt-4 text-xl font-semibold tracking-tight">
              {`${inviter.name} sizni taklif qilyapti`}
            </h1>

            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {siteConfig.description}
            </p>
          </div>

          <div className="mt-8 space-y-2">
            <Button asChild size="lg" fullWidth>
              <Link href="/auth/register">
                <UserPlus className="size-4" aria-hidden="true" />
                Ro&apos;yxatdan o&apos;tish
              </Link>
            </Button>

            {/*
              Allaqachon hisobi borlar uchun yo'l.

              Usiz ular yopiq ko'chada qolardi: sahifada faqat
              "ro'yxatdan o'tish" tursa, kirish uchun manzilni
              qo'lda yozishga majbur bo'lardi.
            */}
            <Button asChild variant="ghost" size="lg" fullWidth>
              <Link href="/auth/login">
                Hisobim bor — kirish
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {/*
            Ochiq gap: taklif hisoblanadi, lekin PUL berilmaydi.

            Odam "mukofot bormi?" degan savol bilan qolmasligi
            kerak. Yolg'on va'da esa birinchi kundanoq ishonchni
            buzardi.
          */}
          <p className="text-muted-foreground mt-6 text-center text-xs leading-relaxed">
            {`Ro'yxatdan o'tsangiz, ${inviter.name} sizni taklif qilgani hisobga olinadi. Bu hech qanday to'lovni talab qilmaydi.`}
          </p>
        </>
      ) : (
        <>
          <Alert variant="warning" title="Havola ishlamadi">
            Taklif havolasi eskirgan yoki noto&apos;g&apos;ri. Bu ro&apos;yxatdan o&apos;tishga
            xalaqit bermaydi — bemalol davom eting.
          </Alert>

          <div className="mt-6 space-y-2">
            <Button asChild size="lg" fullWidth>
              <Link href="/auth/register">Ro&apos;yxatdan o&apos;tish</Link>
            </Button>

            <Button asChild variant="ghost" size="lg" fullWidth>
              <Link href="/">Bosh sahifa</Link>
            </Button>
          </div>
        </>
      )}
    </main>
  );
}

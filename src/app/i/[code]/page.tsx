import type { Metadata } from 'next';

import { InviteContent } from '@/app/i/[code]/invite-content';
import { cleanReferralCode } from '@/config/referral';
import { siteConfig } from '@/config/site';
import { findByReferralCode } from '@/modules/referral/referral.service';

interface PageProps {
  params: Promise<{ code: string }>;
}

/**
 * Ulashilganda ko'rinadigan kartochka.
 *
 * ── Nima uchun ism SARLAVHAGA chiqadi ─────────────────────────────────
 * Telegram va WhatsApp havolani kartochka qilib ko'rsatadi. Unda
 * "Navix" degan umumiy yozuv tursa, odam uni reklama deb o'tkazib
 * yuboradi.
 *
 * "Sardor sizni Navixga taklif qilyapti" esa aniq: kim va nima
 * uchun.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const inviter = await findByReferralCode(cleanReferralCode(code));

  if (!inviter) {
    return { title: 'Taklif havolasi', robots: { index: false } };
  }

  const title = `${inviter.name} sizni ${siteConfig.name}ga taklif qilyapti`;

  return {
    title,
    description: siteConfig.description,
    /*
      Qidiruv tizimlari bu sahifani INDEKSLAMAYDI.

      Har bir foydalanuvchining havolasi alohida sahifa. Ularni
      indekslash Google'da minglab bir xil sahifa yaratardi va bu
      saytning umumiy o'rnini tushirardi.
    */
    robots: { index: false, follow: true },
    openGraph: { title, description: siteConfig.description, type: 'website' },
    twitter: { card: 'summary_large_image', title },
  };
}

/**
 * Taklif havolasi ochilganda ko'rinadigan sahifa.
 *
 * ── Nima uchun alohida sahifa ─────────────────────────────────────────
 * Kodni tanishtiruv sahifasiga `?ref=` bilan qo'shish mumkin edi.
 * Lekin unda odam KIM taklif qilganini bilmaydi va havola
 * ulashilganda xunuk ko'rinadi.
 *
 * ── Nima uchun kod SERVERDA tekshiriladi ──────────────────────────────
 * Noto'g'ri havola bilan kelgan odamga "kod ishlamadi" deb aytish
 * kerak — lekin uni ro'yxatdan o'tishdan TO'XTATMASLIK kerak.
 * Server bu farqni oldindan biladi va sahifa mos matnni chizadi.
 */
export default async function InvitePage({ params }: PageProps) {
  const { code } = await params;
  const clean = cleanReferralCode(code);
  const inviter = await findByReferralCode(clean);

  return <InviteContent code={clean} inviter={inviter} />;
}

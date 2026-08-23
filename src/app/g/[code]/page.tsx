import type { Metadata } from 'next';

import { GroupInviteContent } from '@/app/g/[code]/group-invite-content';
import { cleanGroupInviteCode, isGroupInviteCode } from '@/config/group-invite';
import { siteConfig } from '@/config/site';
import { previewGroupInvite } from '@/modules/chat/group-invite.service';

interface PageProps {
  params: Promise<{ code: string }>;
}

/**
 * Ulashilganda ko'rinadigan kartochka.
 *
 * ── Nima uchun guruh nomi SARLAVHAGA chiqadi ──────────────────────────
 * Havola Telegram'ga tashlanadi va u yerda kartochka bo'lib ko'rinadi.
 * "Navix" degan umumiy yozuv tursa, odam uni reklama deb o'tkazib
 * yuboradi. «Ish jamoasi» guruhiga qo'shiling degan yozuv esa aniq.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const clean = cleanGroupInviteCode(code);

  const preview = isGroupInviteCode(clean) ? await previewGroupInvite(clean) : null;

  if (!preview) {
    return { title: 'Guruh havolasi', robots: { index: false } };
  }

  const title = `«${preview.title}» guruhiga qo'shiling`;

  return {
    title,
    description: `${siteConfig.name}dagi guruh suhbati.`,
    /*
      Qidiruv tizimlari bu sahifani INDEKSLAMAYDI.

      Aks holda guruh havolalari Google'ga tushib, ular ochiq
      bo'lib qolardi — havolaning butun ma'nosi esa uni faqat
      kerakli odamlarga berishda.
    */
    robots: { index: false, follow: false },
    openGraph: { title, type: 'website' },
  };
}

/**
 * Guruh havolasi ochilganda ko'rinadigan sahifa.
 *
 * ── Nima uchun ma'lumot SERVERDA olinadi ──────────────────────────────
 * Sahifa ochilishi bilan guruh nomi ko'rinishi kerak. Brauzerda
 * so'ralsa, odam avval bo'sh ekranni, keyin nomni ko'rardi — bu
 * havolaga ishonchni pasaytiradi.
 */
export default async function GroupInvitePage({ params }: PageProps) {
  const { code } = await params;
  const clean = cleanGroupInviteCode(code);

  const preview = isGroupInviteCode(clean) ? await previewGroupInvite(clean) : null;

  return <GroupInviteContent code={clean} preview={preview} />;
}

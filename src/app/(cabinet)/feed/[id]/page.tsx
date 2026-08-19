import type { Metadata } from 'next';

import { PostDetailContent } from '@/app/(cabinet)/feed/[id]/post-detail-content';
import { siteConfig } from '@/config/site';
import { loadSharePreview } from '@/modules/feed/share-preview.service';

interface PostPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Ulashilgan havolaning sarlavhasi va tavsifi.
 *
 * ── Nima uchun bu MUHIM ───────────────────────────────────────────────
 * Ilgari har bir post havolasi bir xil ko'rinardi: "Post — Navix".
 * Telegramda o'nta turli video ulashilsa, o'ntasi ham bir xil
 * kulrang kartochka bo'lardi va hech kim qaysi biri qiziqligini
 * bilmasdi.
 *
 * Muallif nomi va matn boshi ko'rinsa, havola O'ZI reklama bo'ladi.
 *
 * ── Nima uchun `null` holati ham to'g'ri ishlashi kerak ───────────────
 * Post o'chirilgan yoki muallifi bloklangan bo'lishi mumkin. Bunday
 * holatda umumiy Navix kartochkasi ko'rsatiladi: "post topilmadi"
 * degan kartochka havolani ochishga undamasdi.
 */
export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { id } = await params;
  const preview = await loadSharePreview(id);

  if (!preview) {
    return { title: 'Post', description: 'Post va unga yozilgan izohlar.' };
  }

  const title = preview.isVideo ? `${preview.authorName} — video` : preview.authorName;

  return {
    title,
    description: preview.description,
    /*
      `openGraph` va `twitter` — IKKALASI ham kerak.

      Telegram va WhatsApp `og:` teglarini o'qiydi, X (Twitter) esa
      o'zining `twitter:` teglarini afzal ko'radi. Faqat bittasi
      yozilsa, boshqasida kartochka bo'sh chiqardi.
    */
    openGraph: {
      title,
      description: preview.description,
      type: 'article',
      siteName: siteConfig.name,
      locale: siteConfig.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: preview.description,
    },
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;

  return <PostDetailContent postId={id} />;
}

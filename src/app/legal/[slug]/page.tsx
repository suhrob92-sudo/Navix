import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { LEGAL_DOCUMENTS, getLegalDocument } from '@/config/legal';
import { hasFullRequisites } from '@/config/legal/company';
import { LegalDocumentView } from '@/components/legal/legal-document-view';

type Params = { slug: string };

/**
 * Uchta hujjat ham OLDINDAN chiziladi.
 *
 * Ular o'zgarmas matn: har so'rovda qayta yasashning ma'nosi yo'q va
 * bu sahifalarni qidiruv roboti ham, to'lov tashkiloti tekshiruvchisi
 * ham tez ochishi kerak.
 */
export function generateStaticParams(): Params[] {
  return LEGAL_DOCUMENTS.map((document) => ({ slug: document.slug }));
}

/**
 * Ro'yxatda yo'q manzil — DARHOL 404.
 *
 * Busiz Next.js noma'lum manzilni ham sahifaga uzatardi. Sahifa
 * `notFound()` chaqirsa ham javob kodi `200` bo'lib qolardi:
 * ekranda "topilmadi" yozuvi, javobda esa "hammasi joyida".
 *
 * Qidiruv roboti buni mavjud sahifa deb hisoblab indeksga qo'shardi,
 * to'lov tashkiloti tekshiruvchisi esa xato havolani ochib "sahifa
 * bor" degan xulosaga kelardi. Hujjatlar ro'yxati qat'iy — shuning
 * uchun undan tashqarisi umuman chizilmaydi.
 */
export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const document = getLegalDocument(slug);

  if (!document) return { title: 'Hujjat topilmadi' };

  /**
   * Rekvizitsiz oferta qidiruvga BERILMAYDI.
   *
   * Chala shartnoma qidiruv natijasida chiqib qolsa, uni to'liq
   * hujjat deb o'qishardi. Rekvizitlar to'ldirilgach bu cheklov
   * o'zi yo'qoladi.
   */
  const isDraft = document.requiresRequisites === true && !hasFullRequisites();

  return {
    title: document.title,
    description: document.summary,
    alternates: { canonical: `/legal/${document.slug}` },
    ...(isDraft ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function LegalDocumentPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const document = getLegalDocument(slug);

  if (!document) notFound();

  return (
    <>
      <Link
        href="/legal"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-2 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Barcha hujjatlar
      </Link>

      <LegalDocumentView document={document} />
    </>
  );
}

import type { MetadataRoute } from 'next';

import { LEGAL_DOCUMENTS, legalHref } from '@/config/legal';
import { siteConfig } from '@/config/site';

/**
 * Sayt xaritasi (`/sitemap.xml`) — qidiruv robotlari uchun.
 *
 * ── Nima uchun faqat BIR NECHTA manzil ────────────────────────────────
 * Xaritaga faqat OMMAVIY sahifalar tushadi. Ilovaning qolgan qismi
 * kirish talab qiladi va robot u yerga baribir kira olmaydi —
 * ro'yxatga qo'shish faqat foydasiz so'rovlar keltirardi.
 *
 * Foydalanuvchi profillari ham ATAYLAB yo'q: ular kirgan odamgagina
 * ochiladi va odamlarning ismlarini qidiruvga chiqarish — ularning
 * roziligisiz qilinadigan ish.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: siteConfig.url,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      /**
       * Navbat sahifasi — ishga tushirishdan oldingi ro'yxat.
       *
       * Aynan shu havola ijtimoiy tarmoqlarda tarqatiladi, shuning
       * uchun u xaritada bo'lishi kerak.
       */
      url: `${siteConfig.url}/navbat`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    /**
     * Huquqiy hujjatlar — tekshiruvchilar aynan shu havolalarni izlaydi.
     *
     * To'lov tashkilotlari (Click, Payme) va ilova do'konlari
     * ariza ko'rib chiqishda offerta va maxfiylik siyosatini
     * so'raydi. Ular xaritada bo'lsa, havolani qidirib o'tirmaydi.
     */
    {
      url: `${siteConfig.url}/legal`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    ...LEGAL_DOCUMENTS.map((document) => ({
      url: `${siteConfig.url}${legalHref(document.slug)}`,
      lastModified: new Date(document.updatedAt),
      changeFrequency: 'yearly' as const,
      priority: 0.4,
    })),
    {
      url: `${siteConfig.url}/auth/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteConfig.url}/auth/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}

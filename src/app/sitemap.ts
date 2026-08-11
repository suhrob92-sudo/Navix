import type { MetadataRoute } from 'next';

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

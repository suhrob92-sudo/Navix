import type { MetadataRoute } from 'next';

import { PROTECTED_PREFIXES } from '@/config/protected-routes';
import { siteConfig } from '@/config/site';

/**
 * Qidiruv robotlari uchun qoidalar (`/robots.txt`).
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Google ilovaning ICHKI sahifalarini indekslashga urinadi: hamyon,
 * buyurtmalar, yozishmalar. U yerga kira olmagani uchun robot faqat
 * kirish sahifasini ko'radi va natijada qidiruvda "Navix — kirish"
 * degan o'nlab bir xil sahifa chiqib qolardi.
 *
 * Bundan tashqari har bir urinish serverga so'rov: minglab foydasiz
 * so'rov bepul limitni yeydi.
 *
 * ── Nima uchun ro'yxat QO'LDA yozilmaydi ──────────────────────────────
 * Himoyalangan manzillar ro'yxati allaqachon bor va u `proxy.ts` da
 * ishlatiladi. Bu yerda qayta yozilsa, yangi bo'lim qo'shilganda
 * ikkinchi joy unutilardi.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      /**
       * Kirish talab qiladigan hamma narsa va API yopiladi.
       *
       * `/monitoring` — xato hisobotlari o'tadigan yo'l, uning
       * indekslanishi mutlaqo ma'nosiz.
       */
      disallow: [...PROTECTED_PREFIXES.map((prefix) => `${prefix}/`), '/api/', '/monitoring'],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}

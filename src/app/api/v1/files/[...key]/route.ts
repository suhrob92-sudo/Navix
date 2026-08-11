import type { NextRequest } from 'next/server';

import { isBlobConfigured, readLocalObject } from '@/lib/storage';

/**
 * GET /api/v1/files/... — MAHALLIY saqlangan rasmni beradi.
 *
 * ── Nima uchun bu yo'l bor ───────────────────────────────────────────
 * `BLOB_READ_WRITE_TOKEN` berilmaganda rasmlar `.uploads/` papkasiga
 * yoziladi (`src/lib/storage.ts` da sabab batafsil). Papka esa
 * tashqaridan ochilmaydi — uni shu manzil beradi.
 *
 * Blob rejimida bu manzil umuman ishlatilmaydi: u yerdagi rasmlar
 * to'g'ridan-to'g'ri Vercel domenidan keladi.
 *
 * ── Nima uchun KIRISH talab qilinmaydi ───────────────────────────────
 * Rasm manzili allaqachon ommaviy: postdagi rasmni istalgan
 * obunachi ko'radi va uni yuklashda token yuborilmaydi (`<img>` shunday
 * ishlaydi). Blob rejimida ham manzil ommaviy — ikkala yo'l bir xil
 * bo'lishi kerak, aks holda mahalliy sinov production'ga mos
 * kelmasdi.
 *
 * Manzil ichida tasodifiy nom bor: uni bilmasdan topib bo'lmaydi.
 */
export const dynamic = 'force-dynamic';

type Params = { key: string[] };

/** Kengaytmadan turni aniqlaydi — brauzer faylni shunga qarab ochadi. */
function contentTypeFor(key: string): string {
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.webp')) return 'image/webp';
  if (key.endsWith('.gif')) return 'image/gif';

  /*
    Ovoz turlari: brauzer `<audio>` elementini aynan shu sarlavhaga
    qarab ochadi. Noto'g'ri tur berilsa, ovoz umuman ijro etilmasdi.
  */
  if (key.endsWith('.webm')) return 'audio/webm';
  if (key.endsWith('.m4a')) return 'audio/mp4';
  if (key.endsWith('.ogg')) return 'audio/ogg';

  return 'image/jpeg';
}

export async function GET(_request: NextRequest, context: { params: Promise<Params> }) {
  if (isBlobConfigured()) {
    return new Response('Not found', { status: 404 });
  }

  const { key } = await context.params;
  const path = key.join('/');

  const data = await readLocalObject(path);

  if (!data) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(new Uint8Array(data), {
    headers: {
      'content-type': contentTypeFor(path),
      /**
       * Rasm bir marta yuklanadi va o'zgarmaydi: uning nomi
       * tasodifiy, ya'ni yangi rasm — yangi manzil. Shuning uchun
       * uzoq muddat keshlash xavfsiz.
       */
      'cache-control': 'public, max-age=31536000, immutable',
      // Rasm sifatida chizilsin, brauzer boshqa narsa deb "taxmin" qilmasin.
      'x-content-type-options': 'nosniff',
    },
  });
}

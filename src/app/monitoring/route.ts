import type { NextRequest } from 'next/server';

import { SENTRY_DSN } from '@/lib/observability';

/**
 * POST /monitoring — brauzerdagi xatolarni Sentry'ga uzatuvchi yo'l.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Reklama to'sarlari (AdBlock, uBlock) va ba'zi operatorlar Sentry
 * domenini to'sadi. Natijada brauzerdagi xatolarning katta qismi
 * umuman yetib kelmaydi — ya'ni ilovaning eng ko'p ishlatiladigan
 * qismi kuzatuvsiz qoladi.
 *
 * Bu yerda esa hisobot BIZNING domenimizga yuboriladi va shu yerdan
 * Sentry'ga uzatiladi. To'sar buni to'sa olmaydi: manzil oddiy ilova
 * manzili.
 *
 * ── Nima uchun QO'LDA yozilgan ────────────────────────────────────────
 * Sentry'ning o'z `tunnelRoute` sozlamasi bor, lekin u Turbopack bilan
 * yo'l YARATMAYDI: build o'tadi, manzil esa yo'q bo'ladi va xatolar
 * jimgina yo'qoladi. Bunday "jim ishlamaslik" eng yomon holat —
 * shuning uchun yo'l ko'z oldida turadi.
 */
export const dynamic = 'force-dynamic';

/**
 * Eng katta hisobot hajmi — 200 KB.
 *
 * Haqiqiy hisobot 5-30 KB. Chegara suiiste'moldan himoya: bu manzil
 * ochiq va usiz orqali istalgan hajmdagi ma'lumot uzatish mumkin
 * bo'lardi.
 */
const MAX_ENVELOPE_BYTES = 200 * 1024;

interface DsnParts {
  ingestUrl: string;
  publicKey: string;
}

/**
 * DSN'ni bo'laklarga ajratadi.
 *
 * DSN ko'rinishi: `https://<kalit>@<host>/<loyihaId>`
 * Yuboriladigan manzil: `https://<host>/api/<loyihaId>/envelope/`
 */
function parseDsn(dsn: string): DsnParts | null {
  try {
    const parsed = new URL(dsn);
    const projectId = parsed.pathname.replace(/^\//, '');

    if (!projectId || !parsed.username) return null;

    return {
      ingestUrl: `${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/`,
      publicKey: parsed.username,
    };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  if (!SENTRY_DSN) {
    // Kuzatuv o'chiq — hisobot kerak emas, lekin brauzerga xato ham bermaymiz.
    return new Response(null, { status: 204 });
  }

  const target = parseDsn(SENTRY_DSN);

  if (!target) {
    return new Response(null, { status: 204 });
  }

  const body = await request.text();

  if (body.length > MAX_ENVELOPE_BYTES) {
    return new Response('Envelope too large', { status: 413 });
  }

  /**
   * Hisobot HAQIQATAN bizning loyihamizga tegishlimi.
   *
   * ── Nima uchun bu tekshiruv MAJBURIY ────────────────────────────────
   * Bu manzil ochiq: unga istalgan odam so'rov yubora oladi.
   * Tekshiruvsiz uni boshqa loyihaga (yoki begona serverga) ma'lumot
   * uzatish uchun ishlatish mumkin bo'lardi — ya'ni bizning
   * domenimiz begona trafikning yopinchig'iga aylanardi.
   *
   * Konvertning BIRINCHI qatorida sarlavha turadi va unda DSN bor.
   */
  const [header] = body.split('\n', 1);

  let envelopeDsn: string | undefined;

  try {
    envelopeDsn = (JSON.parse(header) as { dsn?: string }).dsn;
  } catch {
    return new Response('Invalid envelope', { status: 400 });
  }

  if (!envelopeDsn || parseDsn(envelopeDsn)?.publicKey !== target.publicKey) {
    return new Response('Unknown project', { status: 403 });
  }

  try {
    const response = await fetch(target.ingestUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-sentry-envelope' },
      body,
    });

    return new Response(null, { status: response.ok ? 200 : 502 });
  } catch {
    /**
     * Uzatib bo'lmadi — brauzerga XATO qaytarilmaydi.
     *
     * Aks holda Sentry SDK qayta-qayta urinardi va u ham, foydalanuvchi
     * ham bekorga trafik sarflardi. Xato hisoboti yo'qolgani esa
     * ilovaning ishlashiga umuman ta'sir qilmaydi.
     */
    return new Response(null, { status: 204 });
  }
}

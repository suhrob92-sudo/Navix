/**
 * Brauzerdagi xatoni serverga yuboradi.
 *
 * ── Nima uchun oddiy `fetch`, `useApiClient` emas ─────────────────────
 * Xato ilova ishga tushgunga qadar ham yuz berishi mumkin — o'shanda
 * React ham, token ham hali yo'q. Shuning uchun bu yerda hech qanday
 * bog'liqlik yo'q: faqat `fetch`.
 */

const ENDPOINT = '/api/v1/client-errors';

/** Matn uzunligi chegaralari — server bilan bir xil. */
const MAX_MESSAGE = 1_000;
const MAX_STACK = 4_000;

/**
 * Bir xil xato QAYTA-QAYTA yuborilmaydi.
 *
 * ── Nima uchun bu MUHIM ───────────────────────────────────────────────
 * Halqa ichidagi xato soniyada yuzlab marta chiqishi mumkin. Har biri
 * uchun so'rov yuborilsa, telefonning trafigi va batareyasi bekorga
 * sarflanardi — ya'ni kuzatuv vositasi foydalanuvchiga zarar yetkazardi.
 *
 * Server ham bir xil xatolarni bitta qatorga yig'adi, ya'ni takroriy
 * so'rovdan hech qanday foyda yo'q.
 */
const sentFingerprints = new Set<string>();

/** Bitta sahifa ochilishida yuboriladigan eng ko'p xato. */
const MAX_REPORTS_PER_PAGE = 20;

let reportCount = 0;

/** Xato obyektidan ma'noli ma'lumot ajratib oladi. */
function describe(error: unknown): { kind: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      kind: error.name || 'Error',
      message: error.message.slice(0, MAX_MESSAGE),
      stack: error.stack?.slice(0, MAX_STACK),
    };
  }

  /**
   * `Error` bo'lmagan qiymat ham tashlanishi mumkin: `throw 'salom'`
   * yoki rad etilgan `Promise` ichidagi obyekt. Ular ham yo'qolmasligi
   * kerak.
   */
  if (typeof error === 'string') {
    return { kind: 'Error', message: error.slice(0, MAX_MESSAGE) };
  }

  try {
    return { kind: 'UnknownError', message: JSON.stringify(error).slice(0, MAX_MESSAGE) };
  } catch {
    return { kind: 'UnknownError', message: String(error).slice(0, MAX_MESSAGE) };
  }
}

export function reportClientError(error: unknown, path: string): void {
  try {
    if (reportCount >= MAX_REPORTS_PER_PAGE) return;

    const details = describe(error);

    if (!details.message) return;

    const fingerprint = `${details.kind}|${details.message}|${path}`;

    if (sentFingerprints.has(fingerprint)) return;

    sentFingerprints.add(fingerprint);
    reportCount += 1;

    /**
     * `keepalive` — sahifa yopilayotganda ham so'rov yetib boradi.
     *
     * Xatolarning katta qismi aynan shu paytda chiqadi: odam
     * kutmaydi va sahifani yopadi. Usiz eng muhim hisobotlar
     * yo'qolardi.
     */
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...details, path }),
      keepalive: true,
    }).catch(() => {
      // Hisobot yetmadi — bu ilovaning ishlashiga ta'sir qilmaydi.
    });
  } catch {
    /**
     * Hisobot yuborishning O'ZI xato bersa, jim qolamiz.
     *
     * Aks holda cheksiz halqa bo'lardi: xato → hisobot → xato → ...
     */
  }
}

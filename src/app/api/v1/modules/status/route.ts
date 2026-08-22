import type { NextRequest } from 'next/server';

import { withApiHandler } from '@/lib/api/handler';
import { enforcePublicRateLimit } from '@/lib/rate-limit';
import { getRequestContext } from '@/lib/request-context';
import { apiSuccess } from '@/lib/api/response';
import { getDisabledModules } from '@/modules/admin/module-switch.service';
import { getModuleById } from '@/config/modules';

/**
 * GET /api/v1/modules/status — hozir yopiq bo'lgan bo'limlar.
 *
 * ── Nima uchun OCHIQ (kirish talab qilinmaydi) ────────────────────────
 * Bu ro'yxatda maxfiy narsa yo'q: u shundoq ham har bir sahifada
 * ko'rinadi. Kirish talab qilinsa, kirmagan odam bosh sahifada
 * yopilgan bo'lim kartochkasini bosib, keyin xato javob olardi.
 *
 * ── Nima uchun sabab ham beriladi ─────────────────────────────────────
 * Foydalanuvchi "nega ishlamayapti?" degan savolga javobni O'SHA
 * YERDA olishi kerak — qo'llab-quvvatlashga yozmasdan.
 */
export const dynamic = 'force-dynamic';

export const GET = withApiHandler(async (request: NextRequest, { requestId }) => {
  /**
   * Ochiq manzil — chegara MANZIL bo'yicha.
   *
   * Sababi `lib/rate-limit.ts` dagi `publicCatalog` izohida: chegarasiz
   * ochiq katalogni skript bilan butunlay ko'chirib olish mumkin.
   */
  await enforcePublicRateLimit('publicCatalog', getRequestContext(request).ipAddress ?? 'anonim');

  const disabled = await getDisabledModules();

  const modules = [...disabled.entries()].map(([moduleId, reason]) => ({
    moduleId,
    name: getModuleById(moduleId)?.name ?? moduleId,
    reason,
  }));

  return apiSuccess(
    { modules },
    {
      requestId,
      /**
       * Qisqa kesh — bo'lim yopilgach eng ko'pi bilan shuncha vaqt
       * o'tib ekranda ham yopiladi. Uzunroq qilish "darhol yopish"
       * degan maqsadga zid bo'lardi.
       */
      headers: { 'cache-control': 'public, max-age=15' },
    },
  );
});

import type { NextRequest } from 'next/server';

/**
 * So'rov haqidagi umumiy ma'lumotlarni ajratib olish.
 * Audit jurnali va sessiyalarda ishlatiladi.
 */

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Foydalanuvchining IP manzilini aniqlaydi.
 *
 * Ilova reverse proxy (Nginx, Vercel, Cloudflare) orqasida ishlaganda
 * haqiqiy IP `x-forwarded-for` sarlavhasida keladi. Undagi birinchi qiymat —
 * asl mijoz manzili.
 */
export function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    const [first] = forwardedFor.split(',');
    const ip = first?.trim();
    if (ip) return ip.slice(0, 45);
  }

  return request.headers.get('x-real-ip')?.slice(0, 45) ?? null;
}

export function getRequestContext(request: NextRequest): RequestContext {
  return {
    ipAddress: getClientIp(request),
    userAgent: request.headers.get('user-agent'),
  };
}

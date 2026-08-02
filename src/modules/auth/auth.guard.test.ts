import { describe, expect, it } from 'vitest';

import type { NextRequest } from 'next/server';

import { Permission, Role } from '@/config/rbac';
import { extractBearerToken, requireAuth, requirePermission } from '@/modules/auth/auth.guard';
import { signAccessToken } from '@/modules/auth/token.service';

/** Test uchun soddalashtirilgan so'rov obyekti. */
function fakeRequest(headers: Record<string, string> = {}): NextRequest {
  return { headers: new Headers(headers) } as unknown as NextRequest;
}

describe('extractBearerToken', () => {
  it("to'g'ri sarlavhadan token ajratadi", () => {
    expect(extractBearerToken(fakeRequest({ authorization: 'Bearer abc123' }))).toBe('abc123');
  });

  it("katta-kichik harfga bog'liq emas", () => {
    expect(extractBearerToken(fakeRequest({ authorization: 'bearer abc123' }))).toBe('abc123');
  });

  it("sarlavha bo'lmasa null qaytaradi", () => {
    expect(extractBearerToken(fakeRequest())).toBeNull();
  });

  it("noto'g'ri sxemani rad etadi", () => {
    expect(extractBearerToken(fakeRequest({ authorization: 'Basic abc123' }))).toBeNull();
  });

  it("token qismi bo'sh bo'lsa null qaytaradi", () => {
    expect(extractBearerToken(fakeRequest({ authorization: 'Bearer ' }))).toBeNull();
  });
});

describe('requireAuth', () => {
  const payload = {
    userId: '11111111-1111-1111-1111-111111111111',
    phone: '+998901234567',
    roles: [Role.CUSTOMER],
    sessionId: '22222222-2222-2222-2222-222222222222',
  };

  it('yaroqli token bilan foydalanuvchini qaytaradi', async () => {
    const token = await signAccessToken(payload);
    const auth = await requireAuth(fakeRequest({ authorization: `Bearer ${token}` }));

    expect(auth.userId).toBe(payload.userId);
    expect(auth.roles).toEqual([Role.CUSTOMER]);
  });

  it("token bo'lmasa 401 xatolik beradi", async () => {
    await expect(requireAuth(fakeRequest())).rejects.toMatchObject({ status: 401 });
  });

  it('yaroqsiz token 401 beradi', async () => {
    await expect(requireAuth(fakeRequest({ authorization: 'Bearer soxta' }))).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe('requirePermission', () => {
  async function requestForRoles(roles: (typeof Role)[keyof typeof Role][]) {
    const token = await signAccessToken({
      userId: '11111111-1111-1111-1111-111111111111',
      phone: '+998901234567',
      roles,
      sessionId: '22222222-2222-2222-2222-222222222222',
    });

    return fakeRequest({ authorization: `Bearer ${token}` });
  }

  it("ruxsati bor foydalanuvchini o'tkazadi", async () => {
    const request = await requestForRoles([Role.CUSTOMER]);

    await expect(requirePermission(request, Permission.TAXI_RIDE_CREATE)).resolves.toBeDefined();
  });

  it("ruxsati yo'q foydalanuvchiga 403 beradi", async () => {
    const request = await requestForRoles([Role.CUSTOMER]);

    await expect(requirePermission(request, Permission.PLATFORM_ADMIN_ACCESS)).rejects.toMatchObject({
      status: 403,
    });
  });

  it('admin ruxsat talab qiladigan amalni bajara oladi', async () => {
    const request = await requestForRoles([Role.ADMIN]);

    await expect(requirePermission(request, Permission.PLATFORM_ADMIN_ACCESS)).resolves.toBeDefined();
  });
});

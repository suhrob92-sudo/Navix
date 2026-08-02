import { describe, expect, it } from 'vitest';

import { Role } from '@/config/rbac';
import {
  generateSecureToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '@/modules/auth/token.service';

const accessPayload = {
  userId: '11111111-1111-1111-1111-111111111111',
  phone: '+998901234567',
  roles: [Role.CUSTOMER],
  sessionId: '22222222-2222-2222-2222-222222222222',
};

const refreshPayload = {
  userId: accessPayload.userId,
  sessionId: accessPayload.sessionId,
};

describe('Access token', () => {
  it("yaratilgan token qayta o'qilganda bir xil ma'lumot beradi", async () => {
    const token = await signAccessToken(accessPayload);
    const decoded = await verifyAccessToken(token);

    expect(decoded.userId).toBe(accessPayload.userId);
    expect(decoded.phone).toBe(accessPayload.phone);
    expect(decoded.roles).toEqual([Role.CUSTOMER]);
    expect(decoded.sessionId).toBe(accessPayload.sessionId);
  });

  it('buzilgan token rad etiladi', async () => {
    const token = await signAccessToken(accessPayload);

    await expect(verifyAccessToken(`${token}buzilgan`)).rejects.toThrow();
  });

  it("bo'sh token rad etiladi", async () => {
    await expect(verifyAccessToken('')).rejects.toThrow();
  });

  it('refresh token access sifatida qabul qilinmaydi', async () => {
    const refreshToken = await signRefreshToken(refreshPayload);

    await expect(verifyAccessToken(refreshToken)).rejects.toThrow();
  });
});

describe('Refresh token', () => {
  it("yaratilgan token qayta o'qiladi", async () => {
    const token = await signRefreshToken(refreshPayload);
    const decoded = await verifyRefreshToken(token);

    expect(decoded.userId).toBe(refreshPayload.userId);
    expect(decoded.sessionId).toBe(refreshPayload.sessionId);
  });

  it('access token refresh sifatida qabul qilinmaydi', async () => {
    const accessToken = await signAccessToken(accessPayload);

    await expect(verifyRefreshToken(accessToken)).rejects.toThrow();
  });
});

describe('hashToken', () => {
  it('bir xil token uchun bir xil hash beradi', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('turli tokenlar uchun turli hash beradi', () => {
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });

  it("hash tokenning o'zini oshkor qilmaydi", () => {
    const token = 'juda-maxfiy-token';

    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toHaveLength(64); // SHA-256 → 64 ta hex belgi
  });
});

describe('generateSecureToken', () => {
  it('har safar noyob qiymat beradi', () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateSecureToken()));

    expect(tokens.size).toBe(100);
  });

  it('URL uchun xavfsiz belgilardan iborat', () => {
    expect(generateSecureToken()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

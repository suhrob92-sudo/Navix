import { describe, expect, it } from 'vitest';

import { detectDeviceLabel } from '@/modules/auth/session.service';

describe('detectDeviceLabel — qurilma nomini aniqlash', () => {
  it('iPhone Safari', () => {
    const userAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

    expect(detectDeviceLabel(userAgent)).toBe('Safari / iPhone');
  });

  it('Android Chrome', () => {
    const userAgent =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

    expect(detectDeviceLabel(userAgent)).toBe('Chrome / Android');
  });

  it('Windows Chrome', () => {
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    expect(detectDeviceLabel(userAgent)).toBe('Chrome / Windows');
  });

  it("Edge brauzeri Chrome deb noto'g'ri aniqlanmaydi", () => {
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';

    expect(detectDeviceLabel(userAgent)).toBe('Edge / Windows');
  });

  it('macOS Firefox', () => {
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0';

    expect(detectDeviceLabel(userAgent)).toBe('Firefox / macOS');
  });

  it("User-Agent bo'lmasa umumiy nom qaytaradi", () => {
    expect(detectDeviceLabel(null)).toBe("Noma'lum qurilma");
    expect(detectDeviceLabel(undefined)).toBe("Noma'lum qurilma");
    expect(detectDeviceLabel('')).toBe("Noma'lum qurilma");
  });
});

// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useApiQuery } from '@/hooks/use-api';

/**
 * `useApiQuery` — ESKI javob yangi manzilga yopishib qolmasligi.
 *
 * ── HAQIQIY XATO ──────────────────────────────────────────────────────
 * Manzil o'zgarganda yangi so'rov yuborilardi, lekin javob kelguncha
 * `data` da AVVALGI so'rovning natijasi turardi. Xato bo'lganda ham
 * u tozalanmasdi.
 *
 * Pul o'tkazish ekranida bu shunday ko'rindi: odam o'z raqamini
 * yozdi, keyin uni o'zgartirdi — va ekranda IKKALASI ham turdi:
 * "foydalanuvchi topilmadi" VA "bu sizning raqamingiz".
 *
 * Undan ham xavflisi: raqam A dan B ga o'zgarganda javob kelgunicha
 * ekranda A ODAMNING ISMI turardi. Odam ismni ko'rib tasdiqlashi
 * mumkin edi, pul esa boshqasiga ketardi.
 */

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock('@/lib/api-client', () => ({
  apiRequest,
  ApiClientError: class extends Error {
    status = 0;
  },
  toUserMessage: (error: unknown) => String(error),
}));

/*
  Kirish tekshiruvi tugagan deb hisoblanadi.

  Qaytariladigan obyekt DOIMIY: har chaqiruvda yangisi yasalsa,
  `useApiClient` ichidagi `useCallback` har chizishda yangilanardi va
  so'rov cheksiz takrorlanardi.
*/
const REFRESH = async () => 't';
const AUTH = { accessToken: 't', refresh: REFRESH, isLoading: false };

vi.mock('@/modules/auth/auth-context', () => ({ useAuth: () => AUTH }));

beforeEach(() => {
  apiRequest.mockReset();
});

describe('useApiQuery — manzil almashganda', () => {
  it('eski javob tozalanadi', async () => {
    /** `/b` javobini ataylab ushlab turamiz. */
    let release: (value: unknown) => void = () => {};

    apiRequest.mockImplementation((path: string) => {
      if (path === '/a') return Promise.resolve({ name: 'Aziz', isSelf: true });

      return new Promise((resolve) => {
        release = resolve;
      });
    });

    const { result, rerender } = renderHook(({ path }) => useApiQuery<{ name: string }>(path), {
      initialProps: { path: '/a' },
    });

    await waitFor(() => expect(result.current.data).toEqual({ name: 'Aziz', isSelf: true }));

    rerender({ path: '/b' });

    /*
      Javob KELMASDAN oldin: eski ma'lumot yo'q, kutish holati bor.
      Aynan shu tekshiruv oldin buzilardi.
    */
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(true);

    release({ name: 'Bobur' });

    await waitFor(() => expect(result.current.data).toEqual({ name: 'Bobur' }));
  });

  it('yangi manzil xato bersa, eski javob qaytib kelmaydi', async () => {
    apiRequest.mockImplementation((path: string) =>
      path === '/a' ? Promise.resolve({ name: 'Aziz', isSelf: true }) : Promise.reject(new Error('topilmadi')),
    );

    const { result, rerender } = renderHook(({ path }) => useApiQuery<{ name: string }>(path), {
      initialProps: { path: '/a' },
    });

    await waitFor(() => expect(result.current.data).not.toBeNull());

    rerender({ path: '/b' });

    await waitFor(() => expect(result.current.error).not.toBeNull());

    /* Xato VA eski ma'lumot bir vaqtda bo'lishi mumkin emas. */
    expect(result.current.data).toBeNull();
  });

  it("manzil `null` bo'lsa kutish holati qolmaydi", async () => {
    apiRequest.mockResolvedValue({ name: 'Aziz' });

    const { result, rerender } = renderHook(
      ({ path }: { path: string | null }) => useApiQuery<{ name: string }>(path),
      { initialProps: { path: '/a' as string | null } },
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());

    /*
      Raqam o'chirilganda manzil `null` bo'ladi. Hech narsa
      so'ralmaydi — demak abadiy skelet ham ko'rsatilmasligi kerak.
    */
    rerender({ path: null });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});

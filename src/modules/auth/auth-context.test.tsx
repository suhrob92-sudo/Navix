// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider, useAuth } from '@/modules/auth/auth-context';

/**
 * `apiRequest` ni almashtiramiz — bu testda tarmoq yo'q.
 *
 * Har chaqiruv sanaladi: aynan SONI muhim, chunki tekshirilayotgan
 * xatti-harakat "bir vaqtda faqat bitta so'rov ketsin" degan qoida.
 */
const apiRequest = vi.hoisted(() => vi.fn());

/**
 * `vi.hoisted` — bu blok fayl boshiga ko'chiriladi.
 *
 * `vi.mock` ham yuqoriga ko'chadi, shuning uchun unda ishlatiladigan
 * har narsa undan OLDIN tayyor bo'lishi kerak. Oddiy `class` bunday
 * ishlamaydi va "Cannot access before initialization" xatosi chiqadi.
 */
const FakeApiError = vi.hoisted(
  () =>
    class FakeApiError extends Error {
      status: number;

      constructor(status: number, message = 'xato') {
        super(message);
        this.status = status;
      }
    },
);

vi.mock('@/lib/api-client', () => ({
  apiRequest,
  ApiClientError: FakeApiError,
  toUserMessage: (error: unknown) => String(error),
  // Haqiqiysi bilan bir xil qoida: 0 va 5xx — serverga yetib bo'lmadi.
  isServerUnreachable: (error: unknown) =>
    error instanceof FakeApiError ? error.status === 0 || error.status >= 500 : error instanceof TypeError,
}));

const USER = {
  id: 'u1',
  phone: '+998901234567',
  firstName: 'Ali',
  lastName: null,
  avatarUrl: null,
  status: 'ACTIVE',
  roles: [],
};

/** Yangilash so'rovi bir zumda emas, biroz kechikib javob beradi. */
function respondSlowly() {
  apiRequest.mockImplementation((path: string) => {
    if (path === '/api/v1/auth/refresh') {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ accessToken: `token-${apiRequest.mock.calls.length}`, expiresInSeconds: 900 }), 20);
      });
    }

    return Promise.resolve({ user: USER, permissions: [], sessionId: 's1' });
  });
}

function countRefreshCalls(): number {
  return apiRequest.mock.calls.filter((call) => call[0] === '/api/v1/auth/refresh').length;
}

async function renderAuth() {
  const view = renderHook(() => useAuth(), { wrapper: AuthProvider });

  // Ilova ochilishidagi birinchi yangilash tugashini kutamiz.
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));

  return view;
}

describe('sessiyani yangilash', () => {
  beforeEach(() => {
    apiRequest.mockReset();
    respondSlowly();
  });

  it('ilova ochilganda sessiyani tiklaydi', async () => {
    const { result } = await renderAuth();

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.id).toBe('u1');
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Server har yangilashda refresh token'ni almashtiradi va eskisi
   * ikkinchi marta ishlatilsa sessiyani O'G'IRLIK deb yopadi.
   *
   * Shuning uchun ikkita yangilash bir vaqtda boshlansa, ular BITTA
   * so'rovga birlashishi shart. Aks holda foydalanuvchi hech narsa
   * qilmasdan tizimdan chiqib qolardi — bu xato brauzer sinovida
   * haqiqatan ham yuz bergan.
   */
  it("bir vaqtda kelgan chaqiruvlar BITTA so'rovga birlashadi", async () => {
    const { result } = await renderAuth();

    const before = countRefreshCalls();

    await act(async () => {
      await Promise.all([result.current.refresh(), result.current.refresh(), result.current.refresh()]);
    });

    expect(countRefreshCalls() - before).toBe(1);
  });

  it('birlashgan chaqiruvlar bir xil tokenni oladi', async () => {
    const { result } = await renderAuth();

    let tokens: (string | null)[] = [];

    await act(async () => {
      tokens = await Promise.all([result.current.refresh(), result.current.refresh()]);
    });

    expect(tokens[0]).toBe(tokens[1]);
    expect(tokens[0]).not.toBeNull();
  });

  it("so'rov tugagach yangi yangilash yuborilaveradi", async () => {
    // Qulf abadiy qolib ketmasligi kerak — aks holda token hech qachon
    // yangilanmasdi va foydalanuvchi 15 daqiqadan keyin chiqib ketardi.
    const { result } = await renderAuth();

    const before = countRefreshCalls();

    await act(async () => {
      await result.current.refresh();
    });
    await act(async () => {
      await result.current.refresh();
    });

    expect(countRefreshCalls() - before).toBe(2);
  });

  it('yangilash muvaffaqiyatsiz bo\'lsa sessiya tozalanadi', async () => {
    const { result } = await renderAuth();

    apiRequest.mockRejectedValue(new FakeApiError(401));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.status).toBe('guest');
  });

  /**
   * ENG MUHIM TEKSHIRUV.
   *
   * Server javob bermasa (baza o'chiq, tarmoq uzilgan), foydalanuvchi
   * TIZIMDAN CHIQMAGAN. Ilgari bu holat ham "sessiya yo'q" deb
   * qaralardi va odam kirish sahifasiga haydalardi — u yerdan esa
   * `proxy.ts` uni qaytarib urardi. Natijada cheksiz aylanish va
   * ekranda abadiy skelet.
   */
  it("server javob bermasa sessiya SAQLANADI", async () => {
    const { result } = await renderAuth();

    expect(result.current.isAuthenticated).toBe(true);

    apiRequest.mockRejectedValue(new FakeApiError(500));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toBe('offline');
    // Eng muhimi: odam tizimda qoldi.
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.id).toBe('u1');
  });

  it("tarmoq uzilganda ham sessiya saqlanadi", async () => {
    const { result } = await renderAuth();

    apiRequest.mockRejectedValue(new TypeError('Failed to fetch'));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toBe('offline');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("aloqa tiklansa holat 'ok' ga qaytadi", async () => {
    const { result } = await renderAuth();

    apiRequest.mockRejectedValue(new FakeApiError(500));
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.status).toBe('offline');

    respondSlowly();
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.status).toBe('ok');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("xatodan keyin ham qulf ochiq qoladi", async () => {
    const { result } = await renderAuth();

    apiRequest.mockRejectedValue(new Error('401'));
    await act(async () => {
      await result.current.refresh();
    });

    respondSlowly();
    const before = countRefreshCalls();

    await act(async () => {
      await result.current.refresh();
    });

    expect(countRefreshCalls() - before).toBe(1);
    expect(result.current.isAuthenticated).toBe(true);
  });
});

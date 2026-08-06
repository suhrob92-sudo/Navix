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

vi.mock('@/lib/api-client', () => ({
  apiRequest,
  ApiClientError: class ApiClientError extends Error {},
  toUserMessage: (error: unknown) => String(error),
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

    apiRequest.mockRejectedValue(new Error('401'));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
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

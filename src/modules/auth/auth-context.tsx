'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { apiRequest } from '@/lib/api-client';
import type { RoleValue } from '@/config/rbac';

/**
 * Brauzer tomonidagi autentifikatsiya holati.
 *
 * MUHIM: access token faqat XOTIRADA (RAM) saqlanadi — `localStorage` da emas.
 * Sababi: `localStorage` ga JavaScript kira oladi, shuning uchun XSS hujumida
 * token o'g'irlanadi. Xotiradagi qiymat esa sahifa yopilishi bilan yo'qoladi.
 *
 * Sahifa yangilanganda token yo'qoladi, lekin `httpOnly` cookie'dagi refresh
 * token saqlanib qoladi — shuning uchun ilova ochilishida avtomatik
 * `/refresh` chaqiriladi va foydalanuvchi tizimda qoladi.
 */

export interface AuthUser {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: string;
  roles: RoleValue[];
}

export interface AuthSession {
  accessToken: string;
  expiresInSeconds: number;
  user: AuthUser;
}

interface RefreshResponse {
  accessToken: string;
  expiresInSeconds: number;
}

interface MeResponse {
  user: AuthUser;
  permissions: string[];
  sessionId: string;
}

/** Xotirada saqlanadigan joriy sessiya. */
interface ActiveSession {
  accessToken: string;
  user: AuthUser;
  /** Token qachon eskiradi (Unix millisekund). */
  expiresAtMs: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  /** Boshlang'ich tekshiruv tugagunicha `true`. */
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  logout: () => Promise<void>;
  /** Access token'ni yangilaydi; muvaffaqiyatsiz bo'lsa `null` qaytaradi. */
  refresh: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Token muddati tugashidan shuncha soniya oldin yangilanadi. */
const REFRESH_MARGIN_SECONDS = 60;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<ActiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setSession = useCallback((incoming: AuthSession) => {
    setSessionState({
      accessToken: incoming.accessToken,
      user: incoming.user,
      expiresAtMs: Date.now() + incoming.expiresInSeconds * 1000,
    });
    setIsLoading(false);
  }, []);

  /**
   * Ayni damda bajarilayotgan yangilash so'rovi.
   *
   * ── Nima uchun kerak (HAQIQIY XATO) ─────────────────────────────────
   * Server har yangilashda refresh token'ni ALMASHTIRADI va eskisini
   * darhol yaroqsiz qiladi. Bundan tashqari eski token ikkinchi marta
   * ishlatilsa, buni O'G'IRLIK deb hisoblab butun sessiyani yopadi —
   * bu to'g'ri himoya.
   *
   * Muammo shundaki, ikkita yangilash BIR VAQTDA boshlanishi mumkin:
   *
   *   1-so'rov  →  yangi token oldi  (eskisi yaroqsiz bo'ldi)
   *   2-so'rov  →  ESKI token bilan keldi  →  "o'g'irlik!" → sessiya yopildi
   *
   * Natijada foydalanuvchi hech narsa qilmasdan tizimdan chiqib qolardi.
   * Buni brauzer sinovida ko'rdik: `/jobs` sahifasi uchta so'rovni
   * bir vaqtda yuboradi va aynan shu holat yuz berdi.
   *
   * Yechim: bir vaqtda FAQAT BITTA so'rov ketadi. Qolgan chaqiruvlar
   * o'sha so'rovning natijasini kutadi. Server tomonidagi himoya esa
   * o'z kuchida qoladi — u haqiqiy o'g'irlikni baribir ushlaydi.
   */
  const inFlightRef = useRef<Promise<string | null> | null>(null);

  const refresh = useCallback(async (): Promise<string | null> => {
    if (inFlightRef.current) return inFlightRef.current;

    const pending = (async () => {
      try {
        const tokens = await apiRequest<RefreshResponse>('/api/v1/auth/refresh', { method: 'POST' });
        const me = await apiRequest<MeResponse>('/api/v1/auth/me', { accessToken: tokens.accessToken });

        setSessionState({
          accessToken: tokens.accessToken,
          user: me.user,
          expiresAtMs: Date.now() + tokens.expiresInSeconds * 1000,
        });

        return tokens.accessToken;
      } catch {
        // Refresh token yo'q yoki eskirgan — bu normal holat (mehmon foydalanuvchi).
        setSessionState(null);
        return null;
      } finally {
        inFlightRef.current = null;
      }
    })();

    inFlightRef.current = pending;

    return pending;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST', accessToken: session?.accessToken });
    } finally {
      // Server javob bermasa ham brauzerdagi holatni tozalaymiz.
      setSessionState(null);
    }
  }, [session?.accessToken]);

  // Ilova ochilganda sessiyani tiklashga urinamiz.
  useEffect(() => {
    let cancelled = false;

    // Tashqi tizim (server) bilan sinxronlash: holat faqat asinxron so'rov
    // tugagach o'zgaradi, shuning uchun ketma-ket (cascading) render bo'lmaydi.
    void refresh().finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Token muddati tugashidan oldin avtomatik yangilaymiz.
  useEffect(() => {
    if (!session) return;

    const delayMs = Math.max(10_000, session.expiresAtMs - Date.now() - REFRESH_MARGIN_SECONDS * 1000);
    const timer = setTimeout(() => void refresh(), delayMs);

    return () => clearTimeout(timer);
  }, [session, refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      isLoading,
      isAuthenticated: session !== null,
      setSession,
      logout,
      refresh,
    }),
    [session, isLoading, setSession, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Autentifikatsiya holatiga kirish. `AuthProvider` ichida chaqirilishi shart. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth() faqat <AuthProvider> ichida ishlatiladi');
  }

  return context;
}

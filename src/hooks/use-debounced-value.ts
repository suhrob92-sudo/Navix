'use client';

import { useEffect, useState } from 'react';

/**
 * Qiymatni KECHIKTIRIB qaytaradi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Qidiruvda har bosilgan harf uchun so'rov yuborilsa, "Aziz" so'zi
 * to'rtta so'rov degani bo'lardi. Mobil internetda bu trafik va
 * batareyani bekorga sarflaydi, serverda esa keraksiz yuk hosil qiladi.
 *
 * Bu hook yozish TO'XTAGANINI kutadi va shundan keyingina yangi
 * qiymatni beradi.
 *
 * ── Nima uchun natija KECHIKKAN ko'rinmaydi ───────────────────────────
 * Kutish vaqti odam bir harfni yozib, ikkinchisiga o'tish vaqtidan
 * qisqa. Ya'ni odam yozib bo'lishi bilan natija chiqadi.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);

    /**
     * Yangi harf kelsa oldingi kutish BEKOR qilinadi.
     *
     * Usiz har harf o'z vaqtida ishga tushib, kechikish umuman
     * bo'lmasdi.
     */
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

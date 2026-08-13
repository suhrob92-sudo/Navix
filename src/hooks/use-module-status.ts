'use client';

import { useEffect, useState } from 'react';

/**
 * Hozir yopiq bo'lgan bo'limlar — brauzer tomoni uchun.
 *
 * ── Nima uchun `useApiQuery` ishlatilmadi ─────────────────────────────
 * U kirish tekshiruvi tugashini kutadi va tokenni qo'shadi. Bu ro'yxat
 * esa OCHIQ: uni kirmagan odam ham ko'rishi kerak, aks holda bosh
 * sahifada yopilgan xizmat ochiq bo'lib ko'rinardi.
 *
 * ── Nima uchun xato YUTILADI ──────────────────────────────────────────
 * So'rov bajarilmasa, ro'yxat bo'sh qoladi va hamma xizmat ochiq
 * ko'rinadi. Bu to'g'ri tanlov: tarmoq uzilgani uchun butun bosh
 * sahifani "yopiq" qilib ko'rsatish nosozlikni kattalashtirardi.
 * Haqiqiy to'siq baribir serverda — so'rov 503 bilan rad etiladi.
 */
export interface DisabledModule {
  moduleId: string;
  name: string;
  reason: string | null;
}

export function useDisabledModules(): Map<string, string | null> {
  const [disabled, setDisabled] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch('/api/v1/modules/status');
        if (!response.ok) return;

        const body = (await response.json()) as { data?: { modules?: DisabledModule[] } };
        const modules = body.data?.modules ?? [];

        if (!cancelled) {
          setDisabled(new Map(modules.map((item) => [item.moduleId, item.reason])));
        }
      } catch {
        // Jimgina o'tkazamiz — yuqoridagi izohga qarang.
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return disabled;
}

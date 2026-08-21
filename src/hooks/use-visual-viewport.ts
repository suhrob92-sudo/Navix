'use client';

import { useEffect, useState } from 'react';

/**
 * Ekranning HAQIQATAN ko'rinib turgan qismi.
 *
 * ── Muammo ────────────────────────────────────────────────────────────
 * Telefon brauzerida ikkita "ekran" bor:
 *
 *   1. QOLIP oynasi (layout viewport) — CSS shu bilan hisoblaydi.
 *      U manzil qatori YASHIRINGAN holatdagi to'liq balandlik.
 *   2. KO'RINADIGAN oyna (visual viewport) — odam ko'rayotgan qism.
 *      Manzil qatori chiqsa yoki klaviatura ochilsa, u kichrayadi.
 *
 * `position: fixed; inset: 0` BIRINCHISIGA yopishadi. Shuning uchun
 * suhbat oynasining pastki cheti ekrandan tashqarida qolishi mumkin —
 * yozish maydoni esa manzil qatori yoki klaviatura ostiga kirib
 * ketadi yoki, aksincha, o'rtada osilib turadi.
 *
 * ── Yechim ────────────────────────────────────────────────────────────
 * Balandlikni CSS emas, brauzerning O'ZI aytadi (`visualViewport`).
 * Oyna aynan ko'rinib turgan qismga teng bo'ladi — manzil qatori
 * ham, klaviatura ham hisobga olinadi.
 *
 * `offsetTop` ham kerak: ba'zi brauzerlar klaviatura ochilganda
 * qolipni kichraytirmasdan, ko'rinadigan oynani PASTGA suradi.
 * U holda oynaning tepasi ham surilishi kerak.
 *
 * ── Nima uchun `null` boshlanadi ──────────────────────────────────────
 * Serverda `window` yo'q. `null` da ekran CSS ning zaxira qiymatini
 * ishlatadi (`100dvh`) — ya'ni JavaScript ishlamasa ham oyna
 * to'g'ri chiziladi.
 */
export interface VisualViewport {
  /** Ko'rinadigan balandlik (piksel) yoki `null` — hali o'lchanmagan. */
  height: number | null;
  /** Ko'rinadigan oyna qolipdan qancha pastga surilgan. */
  offsetTop: number;
}

export function useVisualViewport(): VisualViewport {
  const [state, setState] = useState<VisualViewport>({ height: null, offsetTop: 0 });

  useEffect(() => {
    const viewport = window.visualViewport;

    function update() {
      setState({
        /*
          Yaxlitlash SHART.

          Brauzer kasrli qiymat qaytaradi ("843.3333"). U har
          surishda ozgina o'zgarib turadi va React'ni bir soniyada
          o'nlab marta qayta chizishga majbur qilardi.
        */
        height: Math.round(viewport?.height ?? window.innerHeight),
        offsetTop: Math.round(viewport?.offsetTop ?? 0),
      });
    }

    update();

    /*
      `scroll` ham tinglanadi: manzil qatori aynan surishda
      yashirinadi va shu payt balandlik o'zgaradi.
    */
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return state;
}

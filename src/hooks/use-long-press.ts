'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Uzoq bosish (long press).
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Telefonda o'ng tugma yo'q. Xabar ustidagi amallarni ochish uchun
 * yagona tanish harakat — barmoqni bir lahza ushlab turish. WhatsApp,
 * Telegram va iOS'ning o'zi ham shunday ishlaydi.
 *
 * ── Nima uchun HARAKAT bekor qiladi ───────────────────────────────────
 * Suhbat surilganda barmoq ham ekranda ushlanib turadi. Harakat
 * tekshirilmasa, har surishda amallar varag'i ochilib ketardi — bu
 * chatni ishlatib bo'lmas holga keltirardi.
 */

/** Varaq shuncha millisekunddan keyin ochiladi. */
const HOLD_MS = 450;

/** Barmoq shuncha pikseldan ko'p sursa — bu bosish emas, surish. */
const MOVE_TOLERANCE_PX = 10;

export interface LongPressHandlers {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
}

export function useLongPress(onLongPress: () => void): LongPressHandlers {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originRef = useRef({ x: 0, y: 0 });

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * Komponent yo'q qilinganda taymer ham o'chadi.
   *
   * Usiz, bosib turgan paytda suhbatdan chiqilsa, taymer allaqachon
   * yo'q bo'lgan komponentning funksiyasini chaqirardi.
   */
  useEffect(() => cancel, [cancel]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      // Sichqonchaning faqat CHAP tugmasi. O'ng tugma pastda alohida.
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      originRef.current = { x: event.clientX, y: event.clientY };

      cancel();
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        onLongPress();
      }, HOLD_MS);
    },
    [cancel, onLongPress],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!timerRef.current) return;

      const dx = Math.abs(event.clientX - originRef.current.x);
      const dy = Math.abs(event.clientY - originRef.current.y);

      if (dx > MOVE_TOLERANCE_PX || dy > MOVE_TOLERANCE_PX) cancel();
    },
    [cancel],
  );

  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      /**
       * Brauzerning o'z menyusi CHIQMAYDI.
       *
       * Telefonda uzoq bosishda u "rasmni saqlash / matnni tanlash"
       * menyusini ochadi va bizning varaq ustiga tushib qolardi.
       * Kompyuterda esa o'ng tugma xuddi uzoq bosish kabi ishlaydi.
       */
      event.preventDefault();
      cancel();
      onLongPress();
    },
    [cancel, onLongPress],
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu,
  };
}

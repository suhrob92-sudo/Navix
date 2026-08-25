'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Savat — brauzerda saqlanadi.
 *
 * ── Nima uchun bazada emas ────────────────────────────────────────────
 * Savat — vaqtinchalik ro'yxat, moliyaviy hujjat emas. Uni bazada
 * saqlash har bir "+" bosishda so'rov yuborishni talab qilardi:
 * mobil internetda sekin va trafik sarflaydi.
 *
 * ── Nima uchun bu XAVFSIZ ─────────────────────────────────────────────
 * Savatda FAQAT taom ID'si va soni turadi — narx emas. Buyurtma
 * berishda server narxni bazadan qayta o'qiydi. Ya'ni foydalanuvchi
 * `localStorage` ni tahrirlab narxni o'zgartira olmaydi: eng yomoni,
 * o'z savatini buzadi.
 *
 * ── Nima uchun bitta restoran ─────────────────────────────────────────
 * Har restoranning o'z kuryeri va yetkazish haqi bor. Ikki restorandan
 * bitta buyurtma qilish — ikki alohida yetkazish demak. Shuning uchun
 * boshqa restoran tanlanganda savat tozalanadi (ogohlantirish bilan).
 */

const STORAGE_KEY = 'navix.food.cart.v1';

export interface CartLine {
  menuItemId: string;
  quantity: number;
}

export interface CartState {
  restaurantId: string | null;
  restaurantSlug: string | null;
  restaurantName: string | null;
  lines: CartLine[];
}

const EMPTY: CartState = { restaurantId: null, restaurantSlug: null, restaurantName: null, lines: [] };

/** Boshqa yorliqlar (tab) ham xabardor bo'lishi uchun. */
const CART_EVENT = 'navix:cart-changed';

function readStorage(): CartState {
  if (typeof window === 'undefined') return EMPTY;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;

    const parsed: unknown = JSON.parse(raw);
    if (!isCartState(parsed)) return EMPTY;

    return parsed;
  } catch {
    // Buzuq ma'lumot — savatni tozalab, davom etamiz.
    return EMPTY;
  }
}

/**
 * `localStorage` dagi ma'lumot ISHONCHSIZ: uni foydalanuvchi ham,
 * ilovaning eski versiyasi ham yozgan bo'lishi mumkin. Shuning uchun
 * shakli to'liq tekshiriladi.
 */
function isCartState(value: unknown): value is CartState {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Record<string, unknown>;

  if (!Array.isArray(candidate.lines)) return false;

  return candidate.lines.every(
    (line) =>
      typeof line === 'object' &&
      line !== null &&
      typeof (line as CartLine).menuItemId === 'string' &&
      Number.isInteger((line as CartLine).quantity) &&
      (line as CartLine).quantity > 0,
  );
}

function writeStorage(state: CartState): void {
  if (typeof window === 'undefined') return;

  if (state.lines.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  window.dispatchEvent(new Event(CART_EVENT));
}

export interface UseCartResult extends CartState {
  /** Server tomonda va birinchi chizishda `false` — miltillashning oldini oladi. */
  isReady: boolean;
  totalQuantity: number;
  quantityOf: (menuItemId: string) => number;
  /** Taom qo'shadi. Boshqa restoran bo'lsa `false` qaytaradi. */
  add: (
    restaurant: { id: string; slug: string; name: string },
    menuItemId: string,
  ) => { ok: boolean; conflictWith: string | null };
  /** Yangi restoranga o'tib, savatni tozalaydi. */
  replaceRestaurant: (restaurant: { id: string; slug: string; name: string }, menuItemId: string) => void;
  /**
   * Savatni butunlay YANGI ro'yxat bilan almashtiradi.
   *
   * "Buyurtmani takrorlash" uchun: eski buyurtmadagi taomlar bir
   * yo'la savatga tushadi. Bittalab qo'shish o'nlab yozuv va o'nta
   * qayta chizish degani bo'lardi.
   */
  replaceAll: (restaurant: { id: string; slug: string; name: string }, lines: readonly CartLine[]) => void;
  remove: (menuItemId: string) => void;
  setQuantity: (menuItemId: string, quantity: number) => void;
  clear: () => void;
}

export function useCart(): UseCartResult {
  const [state, setState] = useState<CartState>(EMPTY);
  const [isReady, setIsReady] = useState(false);

  /**
   * `localStorage` faqat brauzerda mavjud. Agar uni to'g'ridan-to'g'ri
   * boshlang'ich qiymat sifatida o'qisak, server chizgan sahifa bilan
   * brauzer chizgani mos kelmaydi (hydration mismatch). Shuning uchun
   * o'qish effektda — birinchi chizishdan keyin.
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readStorage());
    setIsReady(true);

    const sync = () => setState(readStorage());

    window.addEventListener(CART_EVENT, sync);
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const commit = useCallback((next: CartState) => {
    setState(next);
    writeStorage(next);
  }, []);

  const add = useCallback<UseCartResult['add']>(
    (restaurant, menuItemId) => {
      const current = readStorage();

      if (current.restaurantId && current.restaurantId !== restaurant.id && current.lines.length > 0) {
        return { ok: false, conflictWith: current.restaurantName };
      }

      const existing = current.lines.find((line) => line.menuItemId === menuItemId);

      const lines = existing
        ? current.lines.map((line) =>
            line.menuItemId === menuItemId ? { ...line, quantity: line.quantity + 1 } : line,
          )
        : [...current.lines, { menuItemId, quantity: 1 }];

      commit({
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
        restaurantName: restaurant.name,
        lines,
      });

      return { ok: true, conflictWith: null };
    },
    [commit],
  );

  const replaceRestaurant = useCallback<UseCartResult['replaceRestaurant']>(
    (restaurant, menuItemId) => {
      commit({
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
        restaurantName: restaurant.name,
        lines: [{ menuItemId, quantity: 1 }],
      });
    },
    [commit],
  );

  const replaceAll = useCallback<UseCartResult['replaceAll']>(
    (restaurant, lines) => {
      commit({
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
        restaurantName: restaurant.name,
        // Nusxa olinadi: chaqiruvchi ro'yxatni keyin o'zgartirsa savat buzilmasin.
        lines: lines.map((line) => ({ ...line })),
      });
    },
    [commit],
  );

  const setQuantity = useCallback<UseCartResult['setQuantity']>(
    (menuItemId, quantity) => {
      const current = readStorage();

      const lines =
        quantity <= 0
          ? current.lines.filter((line) => line.menuItemId !== menuItemId)
          : current.lines.map((line) => (line.menuItemId === menuItemId ? { ...line, quantity } : line));

      // Oxirgi taom olib tashlansa, restoran bog'lanishi ham tozalanadi.
      commit(lines.length === 0 ? EMPTY : { ...current, lines });
    },
    [commit],
  );

  const remove = useCallback<UseCartResult['remove']>((menuItemId) => setQuantity(menuItemId, 0), [setQuantity]);

  const clear = useCallback(() => commit(EMPTY), [commit]);

  const quantityOf = useCallback(
    (menuItemId: string) => state.lines.find((line) => line.menuItemId === menuItemId)?.quantity ?? 0,
    [state.lines],
  );

  return {
    ...state,
    isReady,
    totalQuantity: state.lines.reduce((sum, line) => sum + line.quantity, 0),
    quantityOf,
    add,
    replaceRestaurant,
    replaceAll,
    remove,
    setQuantity,
    clear,
  };
}

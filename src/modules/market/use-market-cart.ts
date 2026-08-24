'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Marketplace savati — brauzerda saqlanadi.
 *
 * ── Nima uchun bazada emas ────────────────────────────────────────────
 * Savat — vaqtinchalik ro'yxat, moliyaviy hujjat emas. Uni bazada
 * saqlash har bir "+" bosishda so'rov yuborishni talab qilardi.
 *
 * ── Nima uchun bu XAVFSIZ ─────────────────────────────────────────────
 * Savatda FAQAT mahsulot ID'si va soni turadi — narx emas. Buyurtma
 * berishda server narxni bazadan qayta o'qiydi.
 *
 * ── Nima uchun bitta do'kon ───────────────────────────────────────────
 * Har do'konning o'z omborxonasi, yetkazish haqi va muddati bor. Ikki
 * do'kondan bitta buyurtma — ikki alohida jo'natma demak. Shuning uchun
 * boshqa do'kon tanlanganda savat tozalanadi (ogohlantirish bilan).
 *
 * ── Ovqat savatidan farqi ─────────────────────────────────────────────
 * Bu yerda `add` MIQDOR qabul qiladi. Mahsulotni "2 ta" qilib qo'shish
 * odatiy holat, ovqatda esa har bosishda bittadan qo'shilardi.
 */

const STORAGE_KEY = 'navix.market.cart.v1';

export interface MarketCartLine {
  productId: string;
  /**
   * Qaysi variant — rang, o'lcham, xotira.
   *
   * ── Nima uchun savat kaliti IKKITA maydondan ────────────────────────
   * Bir xil mahsulotning qora va oq rangi — savatda IKKI ALOHIDA
   * qator. Faqat mahsulot bo'yicha kalitlansa, ikkinchi rang
   * birinchisining sonini oshirib yuborardi.
   *
   * `undefined` — variantsiz mahsulot.
   */
  variantId?: string;
  quantity: number;
}

/**
 * Savat qatorining kaliti.
 *
 * Variantsiz mahsulotda faqat mahsulot ID'si ishlatiladi — eski
 * savatlar ham shu ko'rinishda saqlangan va ular buzilmasligi
 * kerak.
 */
export function cartLineKey(productId: string, variantId?: string | null): string {
  return variantId ? `${productId}:${variantId}` : productId;
}

export interface MarketCartState {
  shopId: string | null;
  shopSlug: string | null;
  shopName: string | null;
  lines: MarketCartLine[];
}

const EMPTY: MarketCartState = { shopId: null, shopSlug: null, shopName: null, lines: [] };

/** Boshqa yorliqlar (tab) ham xabardor bo'lishi uchun. */
const CART_EVENT = 'navix:market-cart-changed';

export interface CartShop {
  id: string;
  slug: string;
  name: string;
}

/**
 * `localStorage` dagi ma'lumot ISHONCHSIZ: uni foydalanuvchi ham,
 * ilovaning eski versiyasi ham yozgan bo'lishi mumkin. Shuning uchun
 * shakli to'liq tekshiriladi.
 */
function isCartState(value: unknown): value is MarketCartState {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Record<string, unknown>;

  if (!Array.isArray(candidate.lines)) return false;

  return candidate.lines.every(
    (line) =>
      typeof line === 'object' &&
      line !== null &&
      typeof (line as MarketCartLine).productId === 'string' &&
      ((line as MarketCartLine).variantId === undefined ||
        typeof (line as MarketCartLine).variantId === 'string') &&
      Number.isInteger((line as MarketCartLine).quantity) &&
      (line as MarketCartLine).quantity > 0,
  );
}

function readStorage(): MarketCartState {
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

function writeStorage(state: MarketCartState): void {
  if (typeof window === 'undefined') return;

  if (state.lines.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  window.dispatchEvent(new Event(CART_EVENT));
}

export interface UseMarketCartResult extends MarketCartState {
  /** Server tomonda va birinchi chizishda `false` — miltillashning oldini oladi. */
  isReady: boolean;
  totalQuantity: number;
  quantityOf: (productId: string, variantId?: string | null) => number;
  /** Mahsulot qo'shadi. Boshqa do'kon bo'lsa `false` qaytaradi. */
  add: (
    shop: CartShop,
    productId: string,
    quantity?: number,
    variantId?: string | null,
  ) => { ok: boolean; conflictWith: string | null };
  /** Yangi do'konga o'tib, savatni tozalaydi. */
  replaceShop: (
    shop: CartShop,
    productId: string,
    quantity?: number,
    variantId?: string | null,
  ) => void;
  remove: (productId: string, variantId?: string | null) => void;
  setQuantity: (productId: string, quantity: number, variantId?: string | null) => void;
  clear: () => void;
}

export function useMarketCart(): UseMarketCartResult {
  const [state, setState] = useState<MarketCartState>(EMPTY);
  const [isReady, setIsReady] = useState(false);

  /**
   * `localStorage` faqat brauzerda mavjud. Agar uni to'g'ridan-to'g'ri
   * boshlang'ich qiymat sifatida o'qisak, server chizgan sahifa bilan
   * brauzer chizgani mos kelmaydi (hydration mismatch).
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

  const commit = useCallback((next: MarketCartState) => {
    setState(next);
    writeStorage(next);
  }, []);

  const add = useCallback<UseMarketCartResult['add']>(
    (shop, productId, quantity = 1, variantId = null) => {
      const current = readStorage();

      if (current.shopId && current.shopId !== shop.id && current.lines.length > 0) {
        return { ok: false, conflictWith: current.shopName };
      }

      const key = cartLineKey(productId, variantId);
      const existing = current.lines.find(
        (line) => cartLineKey(line.productId, line.variantId) === key,
      );

      const lines = existing
        ? current.lines.map((line) =>
            cartLineKey(line.productId, line.variantId) === key
              ? { ...line, quantity: line.quantity + quantity }
              : line,
          )
        : [...current.lines, { productId, ...(variantId ? { variantId } : {}), quantity }];

      commit({ shopId: shop.id, shopSlug: shop.slug, shopName: shop.name, lines });

      return { ok: true, conflictWith: null };
    },
    [commit],
  );

  const replaceShop = useCallback<UseMarketCartResult['replaceShop']>(
    (shop, productId, quantity = 1, variantId = null) => {
      commit({
        shopId: shop.id,
        shopSlug: shop.slug,
        shopName: shop.name,
        lines: [{ productId, ...(variantId ? { variantId } : {}), quantity }],
      });
    },
    [commit],
  );

  const setQuantity = useCallback<UseMarketCartResult['setQuantity']>(
    (productId, quantity, variantId = null) => {
      const current = readStorage();
      const key = cartLineKey(productId, variantId);

      const lines =
        quantity <= 0
          ? current.lines.filter((line) => cartLineKey(line.productId, line.variantId) !== key)
          : current.lines.map((line) =>
              cartLineKey(line.productId, line.variantId) === key ? { ...line, quantity } : line,
            );

      // Oxirgi mahsulot olib tashlansa — do'kon bog'lanishi ham tozalanadi.
      commit(lines.length === 0 ? EMPTY : { ...current, lines });
    },
    [commit],
  );

  const remove = useCallback<UseMarketCartResult['remove']>(
    (productId, variantId = null) => setQuantity(productId, 0, variantId),
    [setQuantity],
  );

  const clear = useCallback(() => commit(EMPTY), [commit]);

  const quantityOf = useCallback(
    (productId: string, variantId?: string | null) => {
      const key = cartLineKey(productId, variantId);

      return (
        state.lines.find((line) => cartLineKey(line.productId, line.variantId) === key)?.quantity ?? 0
      );
    },
    [state.lines],
  );

  const totalQuantity = state.lines.reduce((sum, line) => sum + line.quantity, 0);

  return {
    ...state,
    isReady,
    totalQuantity,
    quantityOf,
    add,
    replaceShop,
    remove,
    setQuantity,
    clear,
  };
}

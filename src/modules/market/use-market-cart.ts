'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

import { ApiClientError, toUserMessage } from '@/lib/api-client';
import { useApiClient } from '@/hooks/use-api';
import { cartLineKey, clampQuantity, totalQuantity, type CartLine } from '@/config/cart';
import type { CartResponse, CartView } from '@/modules/market/cart.types';

/**
 * Marketplace savati — SERVERDA saqlanadi.
 *
 * ── Nima uchun brauzerdan ko'chirildi ─────────────────────────────────
 * Sabab `src/config/cart.ts` da batafsil: savat brauzer tozalanganda
 * yo'qolardi, qurilmalar orasida bo'linmasdi va serverga ko'rinmagani
 * uchun "savatingizda mahsulot qoldi" degan eslatma imkonsiz edi.
 *
 * ── Nima uchun holat MODUL darajasida, `useState` da emas ─────────────
 * Savatni uchta joy o'qiydi: pastdagi savat chizig'i, mahsulot
 * sahifasi va savatning o'zi.
 *
 * Har biri o'z holatini saqlasa, ularning uchalasi ham serverga
 * alohida so'rov yuborardi va bir-biridan xabarsiz bo'lardi:
 * mahsulot qo'shilgach pastdagi chiziqdagi son o'zgarmasdi.
 *
 * Bitta umumiy do'kon (`store`) esa bitta so'rov va bitta haqiqat
 * beradi. `useSyncExternalStore` — React'ning aynan shu holat uchun
 * mo'ljallangan vositasi.
 *
 * ── Nima uchun EKRAN darhol yangilanadi ───────────────────────────────
 * Har bir "+" bosishda javobni kutish mobil internetda sekin
 * ko'rinardi: odam bosadi, hech narsa o'zgarmaydi, u yana bosadi.
 *
 * Shuning uchun o'zgarish avval ekranda ko'rsatiladi, so'rov esa
 * orqada ketadi. Server xato qaytarsa — o'zgarish ortga qaytariladi
 * va sabab aytiladi.
 */

/** Brauzerdagi eski savat — endi faqat KO'CHIRISH uchun o'qiladi. */
const LEGACY_STORAGE_KEY = 'navix.market.cart.v1';

const EMPTY_CART: CartView = { shop: null, lines: [], savedLines: [], missingCount: 0 };

interface CartStoreState {
  cart: CartView;
  /** Server javobi kelgunicha `false` — miltillashning oldini oladi. */
  isReady: boolean;
  /** Orqada so'rov ketyaptimi. */
  isSyncing: boolean;
  error: string | null;
}

const INITIAL: CartStoreState = { cart: EMPTY_CART, isReady: false, isSyncing: false, error: null };

let state: CartStoreState = INITIAL;

const listeners = new Set<() => void>();

function setState(patch: Partial<CartStoreState>): void {
  state = { ...state, ...patch };

  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CartStoreState {
  return state;
}

/**
 * Server tomonda har doim BO'SH savat.
 *
 * Server foydalanuvchining savatini bilmaydi va uni chizishga
 * urinsa, brauzerdagi natija bilan mos kelmasdi (hydration
 * mismatch).
 */
function getServerSnapshot(): CartStoreState {
  return INITIAL;
}

type Request = <TData>(path: string, options?: Record<string, unknown>) => Promise<TData>;

/** Savat bir marta yuklanadi — sabab komponent izohida. */
let loadPromise: Promise<void> | null = null;

/**
 * Brauzerdagi eski savatni o'qiydi.
 *
 * ── Nima uchun shakl TO'LIQ tekshiriladi ──────────────────────────────
 * `localStorage` dagi ma'lumotni foydalanuvchi ham, ilovaning eski
 * versiyasi ham yozgan bo'lishi mumkin.
 */
function readLegacyCart(): CartLine[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);

    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) return [];

    const lines = (parsed as { lines?: unknown }).lines;

    if (!Array.isArray(lines)) return [];

    return lines.flatMap((line): CartLine[] => {
      if (typeof line !== 'object' || line === null) return [];

      const row = line as Record<string, unknown>;

      if (typeof row.productId !== 'string') return [];
      if (!Number.isInteger(row.quantity) || (row.quantity as number) < 1) return [];

      return [
        {
          productId: row.productId,
          variantId: typeof row.variantId === 'string' ? row.variantId : null,
          quantity: clampQuantity(row.quantity as number),
        },
      ];
    });
  } catch {
    // Buzuq ma'lumot — ko'chiradigan narsa yo'q.
    return [];
  }
}

/**
 * Savatni serverdan yuklaydi va eski savatni bir marta ko'chiradi.
 *
 * ── Nima uchun eski savat MUVAFFAQIYATDAN KEYIN o'chiriladi ───────────
 * So'rov yiqilsa (internet uzilgan bo'lsa) va biz uni oldindan
 * o'chirsak, odamning savati butunlay yo'qolardi. Muvaffaqiyatdan
 * keyin o'chirish esa eng yomon holatda ko'chirishni qayta
 * urinishga olib keladi — u takrorlansa ham xavfsiz.
 */
async function load(request: Request): Promise<void> {
  try {
    const legacy = readLegacyCart();

    const response =
      legacy.length > 0
        ? await request<CartResponse>('/api/v1/market/cart/merge', {
            method: 'POST',
            body: { lines: legacy },
          })
        : await request<CartResponse>('/api/v1/market/cart');

    if (legacy.length > 0 && typeof window !== 'undefined') {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }

    setState({ cart: response.cart, isReady: true, error: null });
  } catch (error) {
    /*
      Savatni yuklab bo'lmadi.

      `isReady` BARIBIR yoqiladi: aks holda pastdagi savat chizig'i
      abadiy skelet holatida qolardi va odam ilovani buzilgan deb
      o'ylardi.
    */
    setState({ isReady: true, error: toUserMessage(error) });
  } finally {
    loadPromise = null;
  }
}

/**
 * So'rovni yuboradi va javobdagi savatni haqiqat deb qabul qiladi.
 *
 * @param optimistic Ekranda DARHOL ko'rsatiladigan holat.
 */
async function mutate(
  request: Request,
  path: string,
  options: Record<string, unknown>,
  optimistic?: CartView,
): Promise<{ ok: boolean; message: string | null }> {
  const previous = state.cart;

  if (optimistic) setState({ cart: optimistic });

  setState({ isSyncing: true, error: null });

  try {
    const response = await request<CartResponse>(path, options);

    setState({ cart: response.cart, isSyncing: false });

    return { ok: true, message: null };
  } catch (error) {
    /*
      Xato — ekrandagi o'zgarish ORTGA qaytariladi.

      Usiz odam savatiga mahsulot qo'shilgandek ko'rardi, lekin u
      serverda yo'q edi va buyurtma berishda "yo'qolib" qolardi.
    */
    const message =
      error instanceof ApiClientError ? error.message : toUserMessage(error);

    setState({ cart: previous, isSyncing: false, error: message });

    return { ok: false, message };
  }
}

export interface UseMarketCartResult {
  /** Savat va "keyinroq" ro'yxati — narxlari bilan. */
  cart: CartView;
  /** Faol qatorlar — qisqa ko'rinish. */
  lines: CartLine[];
  shopId: string | null;
  shopSlug: string | null;
  shopName: string | null;
  isReady: boolean;
  isSyncing: boolean;
  error: string | null;
  totalQuantity: number;
  quantityOf: (productId: string, variantId?: string | null) => number;
  /**
   * Mahsulot qo'shadi.
   *
   * Boshqa do'kon bo'lsa `ok: false` va do'kon nomi qaytadi —
   * so'rov umuman yuborilmaydi.
   */
  add: (
    shop: { id: string; slug: string; name: string },
    productId: string,
    quantity?: number,
    variantId?: string | null,
  ) => { ok: boolean; conflictWith: string | null };
  /** Savatni tozalab, yangi do'kondan boshlaydi. */
  replaceShop: (
    shop: { id: string; slug: string; name: string },
    productId: string,
    quantity?: number,
    variantId?: string | null,
  ) => void;
  setQuantity: (productId: string, quantity: number, variantId?: string | null) => void;
  remove: (productId: string, variantId?: string | null) => void;
  clear: () => void;
  /** "Keyinroq sotib olaman" ro'yxatiga ko'chiradi. */
  saveForLater: (productId: string, variantId?: string | null) => void;
  /** "Keyinroq" ro'yxatidan savatga qaytaradi. */
  moveToCart: (productId: string, variantId?: string | null) => void;
  /** Savatni serverdan qayta o'qiydi. */
  reload: () => void;
}

export function useMarketCart(): UseMarketCartResult {
  const request = useApiClient() as Request;

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    /*
      Savat FAQAT bir marta yuklanadi.

      Uchta komponent ham `useMarketCart()` chaqiradi; qulfsiz
      ularning uchalasi ham bir vaqtda so'rov yuborardi.
    */
    if (state.isReady || loadPromise) return;

    loadPromise = load(request);
  }, [request]);

  const cart = snapshot.cart;

  const lines = cart.lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    quantity: line.quantity,
  }));

  const quantityOf = useCallback(
    (productId: string, variantId?: string | null) => {
      const key = cartLineKey(productId, variantId);

      return (
        cart.lines.find((line) => cartLineKey(line.productId, line.variantId) === key)?.quantity ?? 0
      );
    },
    [cart.lines],
  );

  const add = useCallback<UseMarketCartResult['add']>(
    (shop, productId, quantity = 1, variantId = null) => {
      /*
        Do'kon to'qnashuvi SO'ROVSIZ aniqlanadi.

        Server ham buni tekshiradi, lekin javobini kutish ekranda
        savol oynasini kechiktirardi. Serverdagi tekshiruv esa
        himoya bo'lib qoladi: brauzerdagi holat eskirgan bo'lishi
        mumkin.
      */
      if (cart.shop && cart.shop.id !== shop.id && cart.lines.length > 0) {
        return { ok: false, conflictWith: cart.shop.name };
      }

      void mutate(request, '/api/v1/market/cart', {
        method: 'POST',
        body: { productId, variantId, quantity },
      });

      return { ok: true, conflictWith: null };
    },
    [cart.shop, cart.lines.length, request],
  );

  const replaceShop = useCallback<UseMarketCartResult['replaceShop']>(
    (shop, productId, quantity = 1, variantId = null) => {
      void mutate(request, '/api/v1/market/cart', {
        method: 'POST',
        body: { productId, variantId, quantity, replaceShop: true },
      });
    },
    [request],
  );

  const setQuantity = useCallback<UseMarketCartResult['setQuantity']>(
    (productId, quantity, variantId = null) => {
      const key = cartLineKey(productId, variantId);

      /*
        Ekran DARHOL yangilanadi: son o'zgargandek ko'rinadi va
        so'rov orqada ketadi.
      */
      const optimistic: CartView = {
        ...cart,
        lines:
          quantity <= 0
            ? cart.lines.filter((line) => cartLineKey(line.productId, line.variantId) !== key)
            : cart.lines.map((line) =>
                cartLineKey(line.productId, line.variantId) === key
                  ? { ...line, quantity: clampQuantity(quantity) }
                  : line,
              ),
      };

      void mutate(
        request,
        '/api/v1/market/cart',
        { method: 'PATCH', body: { productId, variantId, quantity } },
        optimistic,
      );
    },
    [cart, request],
  );

  const remove = useCallback<UseMarketCartResult['remove']>(
    (productId, variantId = null) => setQuantity(productId, 0, variantId),
    [setQuantity],
  );

  const clear = useCallback(() => {
    void mutate(request, '/api/v1/market/cart?all=true', { method: 'DELETE' }, { ...cart, shop: null, lines: [] });
  }, [cart, request]);

  const move = useCallback(
    (productId: string, variantId: string | null, savedForLater: boolean) => {
      void mutate(request, '/api/v1/market/cart', {
        method: 'PATCH',
        body: { productId, variantId, savedForLater },
      });
    },
    [request],
  );

  const saveForLater = useCallback<UseMarketCartResult['saveForLater']>(
    (productId, variantId = null) => move(productId, variantId, true),
    [move],
  );

  const moveToCart = useCallback<UseMarketCartResult['moveToCart']>(
    (productId, variantId = null) => move(productId, variantId, false),
    [move],
  );

  const reload = useCallback(() => {
    loadPromise = load(request);
  }, [request]);

  return {
    cart,
    lines,
    shopId: cart.shop?.id ?? null,
    shopSlug: cart.shop?.slug ?? null,
    shopName: cart.shop?.name ?? null,
    isReady: snapshot.isReady,
    isSyncing: snapshot.isSyncing,
    error: snapshot.error,
    totalQuantity: totalQuantity(cart.lines),
    quantityOf,
    add,
    replaceShop,
    setQuantity,
    remove,
    clear,
    saveForLater,
    moveToCart,
    reload,
  };
}

/**
 * Savatni tashqaridan tozalaydi — buyurtma berilgandan keyin.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Buyurtma yaratilganda server savatni o'zi bo'shatadi. Brauzerdagi
 * nusxa esa eski holatda qolardi va odam buyurtma bergandan keyin
 * ham to'la savatni ko'rardi.
 */
export function resetCartState(): void {
  state = INITIAL;
  loadPromise = null;

  for (const listener of listeners) listener();
}

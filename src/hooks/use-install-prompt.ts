'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Ilovani telefonga o'rnatish taklifi.
 *
 * ── Nima uchun bu shunchalik chalkash ─────────────────────────────────
 * Brauzerlar bu ishni UCH XIL qiladi:
 *
 *   1. Android Chrome — `beforeinstallprompt` hodisasini beradi va
 *      biz o'z tugmamizni ko'rsatib, o'sha hodisa orqali o'rnatishni
 *      boshlaymiz.
 *   2. iOS Safari — bunday hodisa UMUMAN yo'q. Foydalanuvchi qo'lda
 *      "Ulashish → Bosh ekranga qo'shish" qilishi kerak. Bizga
 *      faqat yo'l-yo'riq ko'rsatish qoladi.
 *   3. Ilova ALLAQACHON o'rnatilgan bo'lsa — hech narsa
 *      ko'rsatilmasligi kerak.
 *
 * Uchalasini bitta joyda hal qilamiz: ekran faqat natijani oladi.
 *
 * ── Nima uchun do'kon (store), oddiy `useState` emas ──────────────────
 * Holat brauzerdan keladi (`navigator`, `window.matchMedia`) va u
 * serverda yo'q. Uni effekt ichida o'qib `setState` qilish ikki
 * muammo tug'diradi: ortiqcha qayta chizish va server bilan mos
 * kelmaslik.
 *
 * `useSyncExternalStore` esa aynan shu holat uchun — loyihadagi
 * boshqa do'konlar (`watch-preference`, `network-state`) ham
 * shunday yozilgan.
 */

/**
 * Brauzer beradigan hodisa.
 *
 * TypeScript'da uning turi yo'q (u standart emas), shuning uchun
 * kerakli qismini o'zimiz ta'riflaymiz.
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallState =
  /** Hali aniqlanmagan (server tomonida chizilayotgan payt). */
  | 'unknown'
  /** Ilova o'rnatilgan yoki brauzer o'rnatishni taklif qilmadi. */
  | 'unavailable'
  /** Tugma bosilsa o'rnatish oynasi chiqadi. */
  | 'ready'
  /** iOS: qo'lda o'rnatish yo'riqnomasi kerak. */
  | 'manual';

export interface InstallPrompt {
  state: InstallState;
  /** Android'da o'rnatish oynasini ochadi. */
  install: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
  /** Taklifni yopadi va boshqa ko'rsatmaydi. */
  dismiss: () => void;
}

/**
 * Taklif yopilganini eslab qolish uchun kalit.
 *
 * ── Nima uchun ESLAB QOLINADI ─────────────────────────────────────────
 * Odam taklifni yopgan bo'lsa, u javobini bergan. Har kirganda
 * qaytadan chiqarish — javobni eshitmaslik bilan barobar va u
 * ilovaga bo'lgan munosabatni buzadi.
 *
 * ── Nima uchun `localStorage`, serverda emas ──────────────────────────
 * O'rnatish QURILMAGA tegishli: telefonga o'rnatgan odam ish
 * kompyuterida o'rnatmasligi mumkin. Serverda saqlansak, bir
 * qurilmadagi rad javobi ikkinchisiga ko'chirilardi.
 */
const DISMISSED_KEY = 'navix.install.dismissed';

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    /*
      Xotira yopiq bo'lsa (shaxsiy rejim) — taklif KO'RSATILADI.

      Eslab qololmaslik "rad etilgan" degani emas.
    */
    return false;
  }
}

/** Ilova allaqachon o'rnatilgan holatda ishlayaptimi. */
function isStandalone(): boolean {
  /*
    Ikkita tekshiruv kerak.

    `display-mode: standalone` — standart yo'l, Android va yangi
    iOS'da ishlaydi. `navigator.standalone` esa faqat iOS'ning
    eski usuli, lekin u hali ham ko'p telefonda ishlatiladi.
  */
  if (window.matchMedia('(display-mode: standalone)').matches) return true;

  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIos(): boolean {
  /*
    iPad'ni ham hisobga olamiz.

    Yangi iPad o'zini "Macintosh" deb tanishtiradi, lekin unda
    sensorli ekran bor — shu bilan ajratiladi.
  */
  const ua = navigator.userAgent;

  if (/iPhone|iPod/.test(ua)) return true;

  return /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
}

type Listener = () => void;

const listeners = new Set<Listener>();

/** Brauzer bergan hodisa — o'rnatishni faqat u boshlay oladi. */
let promptEvent: InstallPromptEvent | null = null;

/**
 * Oxirgi hisoblangan holat.
 *
 * `getSnapshot` har chizishda BIR XIL qiymat qaytarishi shart,
 * shuning uchun natija keshlanadi va faqat hodisa kelganda
 * qayta hisoblanadi.
 */
let cached: InstallState | null = null;

function compute(): InstallState {
  // Odam taklifni yopgan bo'lsa, boshqa hech narsa ko'rsatilmaydi.
  if (readDismissed()) return 'unavailable';

  if (isStandalone()) return 'unavailable';
  if (isIos()) return 'manual';

  /*
    Hodisa hali kelmagan bo'lsa — taklif KO'RSATILMAYDI.

    Brauzer taklifni o'z shartlari bilan beradi (saytga bir necha
    marta kirgan bo'lish va h.k.). Shartlar bajarilmasa, hodisa
    umuman kelmaydi va bizning tugmamiz ishlamas edi.
  */
  return promptEvent ? 'ready' : 'unavailable';
}

function refresh() {
  cached = compute();

  for (const listener of listeners) listener();
}

function onBeforeInstall(event: Event) {
  /*
    Brauzerning O'Z tasmasi to'xtatiladi.

    Aks holda u ekranning pastida o'zicha paydo bo'lardi va
    bizning tasmamiz bilan ikkitasi birga turardi.
  */
  event.preventDefault();

  promptEvent = event as InstallPromptEvent;
  refresh();
}

function onInstalled() {
  // O'rnatilgach taklif ma'nosini yo'qotadi.
  promptEvent = null;
  refresh();
}

function subscribe(listener: Listener): () => void {
  if (listeners.size === 0) {
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      cached = null;
    }
  };
}

function getSnapshot(): InstallState {
  if (cached === null) cached = compute();

  return cached;
}

function getServerSnapshot(): InstallState {
  return 'unknown';
}

export function useInstallPrompt(): InstallPrompt {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const install = useCallback(async () => {
    if (!promptEvent) return 'unavailable' as const;

    await promptEvent.prompt();

    const { outcome } = await promptEvent.userChoice;

    /*
      Hodisani BIR MARTA ishlatish mumkin.

      Ikkala javobda ham taklif yopiladi: rozi bo'lsa ilova
      o'rnatildi, rad etsa esa uni qayta-qayta bezovta qilish
      noto'g'ri bo'lardi. Brauzer keyingi tashrifda o'zi yangi
      hodisa yuboradi.
    */
    promptEvent = null;
    refresh();

    return outcome;
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /*
        Yozib bo'lmasa ham taklif SHU SEANSDA yopiladi.

        Hodisani tashlash yetarli: `compute` uni topmagach
        `unavailable` qaytaradi.
      */
    }

    promptEvent = null;
    refresh();
  }, []);

  return { state, install, dismiss };
}

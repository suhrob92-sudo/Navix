'use client';

import { z } from 'zod';

import { ATTACHMENT_KINDS } from '@/config/attachments';
import { DRAFT_TTL_DAYS, draftKey } from '@/config/draft';
import { POST_CTA_KINDS } from '@/config/post-cta';
import { POST_CATEGORY_VALUES } from '@/modules/feed/feed.types';

/**
 * Post qoralamasini telefon xotirasida saqlash.
 *
 * ── Nima uchun TELEFONDA, serverda emas ───────────────────────────────
 * Qoralama — bu hali post emas, u shaxsiy va tugallanmagan.
 *
 *   1. Serverga yuborsak, har harfda so'rov ketardi (yoki kechikish
 *      bilan — u holda aynan aloqa uzilgan paytda yo'qolardi).
 *   2. Internet yo'q paytda ham ishlashi kerak — muammoning yarmi
 *      aynan shunda.
 *   3. Tugallanmagan matnni serverda saqlash — uni zaxira nusxaga,
 *      jurnalga va admin ko'ziga tushirish demak. Qoralama esa
 *      hech kimga ko'rsatilmaydi.
 *
 * ── Nima uchun tekshiruv (`zod`) KERAK ────────────────────────────────
 * `localStorage` ni foydalanuvchi qo'lda o'zgartira oladi (brauzer
 * konsoli orqali). Tekshirmasdan o'qisak, buzilgan qiymat oynani
 * yiqitardi va odam post yoza olmay qolardi.
 *
 * Tekshiruv yiqilsa — qoralama shunchaki YO'Q deb hisoblanadi.
 * Bu eng xavfsiz javob.
 */

const attachmentSchema = z.object({
  kind: z.enum(ATTACHMENT_KINDS),
  targetId: z.string(),
  name: z.string(),
  subtitle: z.string().nullable(),
});

const ctaSchema = z.object({
  kind: z.enum(POST_CTA_KINDS),
  value: z.string().nullable(),
});

const placeSchema = z.object({
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

const videoSchema = z.object({
  url: z.string(),
  posterUrl: z.string().nullable(),
  seconds: z.number(),
  trim: z.object({ start: z.number(), end: z.number() }).nullable(),
});

const draftSchema = z.object({
  body: z.string(),
  imageUrl: z.string().nullable(),
  video: videoSchema.nullable(),
  attachments: z.array(attachmentSchema),
  cta: ctaSchema.nullable(),
  category: z.enum(POST_CATEGORY_VALUES).nullable(),
  place: placeSchema.nullable(),
  isSponsored: z.boolean(),
  /** Qachon saqlangani — muddati o'tganini bilish uchun. */
  savedAt: z.number(),
});

export type PostDraft = z.infer<typeof draftSchema>;

/** Saqlashga tayyorlangan qoralama (vaqtsiz — uni do'kon qo'yadi). */
export type DraftInput = Omit<PostDraft, 'savedAt'>;

/**
 * Qoralama BO'SHMI.
 *
 * ── Nima uchun bu tekshiruv kerak ─────────────────────────────────────
 * Odam oynani ochib, hech narsa yozmasdan yopishi mumkin. Shunday
 * bo'sh qoralamani saqlasak, keyingi safar "qoralama tiklandi"
 * degan yozuv chiqardi — hech narsa tiklanmagan holda.
 */
export function isDraftEmpty(draft: DraftInput): boolean {
  return (
    draft.body.trim().length === 0 &&
    draft.imageUrl === null &&
    draft.video === null &&
    draft.attachments.length === 0 &&
    draft.cta === null &&
    draft.category === null &&
    draft.place === null &&
    !draft.isSponsored
  );
}

/** Muddati o'tganmi. */
function isExpired(savedAt: number, now: number): boolean {
  return now - savedAt > DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000;
}

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Oxirgi o'qilgan qiymat.
 *
 * `useSyncExternalStore` snapshot'i HAR chizishda BIR XIL havolani
 * qaytarishi shart. `JSON.parse` har safar yangi obyekt yasaydi va
 * u cheksiz qayta chizishga olib kelardi.
 */
let cachedKey: string | null = null;
let cached: PostDraft | null = null;
let isLoaded = false;

function emit() {
  for (const listener of listeners) listener();
}

/** Xotiradan o'qiydi va tekshiradi. */
function load(userId: string, now: number): PostDraft | null {
  try {
    const raw = window.localStorage.getItem(draftKey(userId));

    if (!raw) return null;

    /*
      `JSON.parse` ALOHIDA ushlanadi.

      Ilgari u tashqi `try` ga tushardi va buzilgan matn (`{buzilgan`)
      o'chirilmasdan qolib ketardi — ya'ni har ochilganda qayta
      o'qilib, qayta rad etilardi.
    */
    let value: unknown;

    try {
      value = JSON.parse(raw);
    } catch {
      window.localStorage.removeItem(draftKey(userId));

      return null;
    }

    const parsed = draftSchema.safeParse(value);

    if (!parsed.success) {
      /*
        Buzilgan qoralama O'CHIRILADI.

        Uni qoldirsak, har ochilganda qayta o'qilib, qayta
        rad etilardi — ya'ni foydasiz ish abadiy takrorlanardi.
      */
      window.localStorage.removeItem(draftKey(userId));

      return null;
    }

    if (isExpired(parsed.data.savedAt, now)) {
      window.localStorage.removeItem(draftKey(userId));

      return null;
    }

    return parsed.data;
  } catch {
    /*
      Xotira yopiq (shaxsiy rejim) yoki to'lgan.

      Qoralama — qulaylik, majburiyat emas. Ishlamasa, ilova
      avvalgidek ishlayveradi.
    */
    return null;
  }
}

export function subscribeDraft(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getDraft(userId: string): PostDraft | null {
  if (!isLoaded || cachedKey !== userId) {
    cachedKey = userId;
    cached = load(userId, Date.now());
    isLoaded = true;
  }

  return cached;
}

export function getServerDraft(): PostDraft | null {
  /*
    Serverda qoralama HAR DOIM yo'q.

    U telefon xotirasida turadi va serverga umuman yetib bormaydi.
  */
  return null;
}

export function saveDraft(userId: string, input: DraftInput): void {
  if (isDraftEmpty(input)) {
    clearDraft(userId);

    return;
  }

  const draft: PostDraft = { ...input, savedAt: Date.now() };

  cachedKey = userId;
  cached = draft;
  isLoaded = true;

  try {
    window.localStorage.setItem(draftKey(userId), JSON.stringify(draft));
  } catch {
    /*
      Xotira to'lgan bo'lishi mumkin.

      Bu holda qoralama SAQLANMAYDI, lekin oynadagi matn joyida
      qoladi — ya'ni odam hozir yozayotgan ishini yo'qotmaydi.
    */
  }

  emit();
}

export function clearDraft(userId: string): void {
  try {
    window.localStorage.removeItem(draftKey(userId));
  } catch {
    // O'chirib bo'lmasa ham keyingi o'qishda xotiradan qayta ko'riladi.
  }

  /*
    Kesh SAQLANMAYDI, QAYTA O'QILADIGAN qilib belgilanadi.

    ── Nima uchun `cached = null` yetarli emas ─────────────────────────
    O'chirishdan keyin xotirada yangi qiymat paydo bo'lishi mumkin:
    boshqa varaq (tab) yozgan bo'lsa yoki sinov qo'lda yozsa.

    Keshga `null` yozib qo'ysak, o'sha yangi qiymat hech qachon
    o'qilmasdi va qoralama "yo'qolgan" bo'lib ko'rinardi.

    `isLoaded = false` esa keyingi o'qishda xotiradan bir marta
    qayta ko'rishga majbur qiladi — undan keyin kesh yana
    barqaror bo'ladi (`useSyncExternalStore` talabi).
  */
  cachedKey = null;
  cached = null;
  isLoaded = false;

  emit();
}

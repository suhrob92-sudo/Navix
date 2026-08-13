import { PRIVACY_POLICY } from '@/config/legal/privacy';
import { PUBLIC_OFFER } from '@/config/legal/offer';
import { TERMS_OF_USE } from '@/config/legal/terms';
import type { LegalDocument } from '@/config/legal/legal.types';

/**
 * Huquqiy hujjatlar ro'yxati — YAGONA manba.
 *
 * Sahifalar, pastki menyu, sayt xaritasi va ro'yxatdan o'tish
 * formasi shu ro'yxatdan oziqlanadi. Yangi hujjat qo'shilganda
 * u hamma joyda o'zi paydo bo'ladi va bir joyda unutilib
 * qolmaydi.
 *
 * Tartib — o'qish tartibi: avval qoidalar, keyin ma'lumot,
 * oxirida shartnoma.
 */
export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [TERMS_OF_USE, PRIVACY_POLICY, PUBLIC_OFFER];

/** Hujjatni manzildagi nomi bo'yicha topadi. */
export function getLegalDocument(slug: string): LegalDocument | null {
  return LEGAL_DOCUMENTS.find((document) => document.slug === slug) ?? null;
}

/** Hujjat sahifasining to'liq manzili. */
export function legalHref(slug: string): string {
  return `/legal/${slug}`;
}

export { PRIVACY_POLICY, PUBLIC_OFFER, TERMS_OF_USE };
export type { LegalBlock, LegalDocument, LegalSection } from '@/config/legal/legal.types';

import type { CatalogImageView, CatalogThumb } from '@/modules/catalog/catalog-image.types';

/**
 * Rasmlarni o'qish uchun tayyor bo'laklar.
 *
 * ── Nima uchun ALOHIDA fayl ───────────────────────────────────────────
 * Bu bo'laklar oltita boshqa-boshqa xizmatda ishlatiladi: bozor,
 * ovqat, mehmonxona, ishga joylashish va boshqalar.
 *
 * Har birida qo'lda yozilsa, birida `take: 1` unutilardi va o'sha
 * sahifa 40 ta mahsulotga 320 ta rasm manzilini yuklab, sekin
 * ochiladigan bo'lardi. Bunday xatoni ko'rish esa deyarli imkonsiz.
 */

/**
 * Ro'yxat uchun: FAQAT asosiy rasm.
 *
 * `take: 1` va tartib bo'yicha saralash birga ishlaydi — ya'ni
 * eng kichik `sortOrder` li rasm olinadi.
 */
export const THUMB_SELECT = {
  select: { url: true, alt: true },
  orderBy: { sortOrder: 'asc' },
  take: 1,
} as const;

/** Batafsil sahifa uchun: butun galereya. */
export const GALLERY_SELECT = {
  select: { id: true, url: true, alt: true, sortOrder: true },
  orderBy: { sortOrder: 'asc' },
} as const;

/**
 * Bazadan kelgan ro'yxatni bitta rasmga aylantiradi.
 *
 * ── Nima uchun `null` qaytariladi ─────────────────────────────────────
 * Rasmsiz mahsulot bo'lishi MUMKIN: sotuvchi uni endi qo'shgan
 * bo'lishi mumkin. Sahifa bunday holatda rangli o'rin egallovchi
 * ko'rsatadi — bu bo'sh kvadratdan ko'ra tushunarli.
 */
export function toThumb(images: readonly { url: string; alt: string }[]): CatalogThumb | null {
  const first = images[0];

  return first ? { url: first.url, alt: first.alt } : null;
}

/** Galereya qatorlarini javob turiga aylantiradi. */
export function toGallery(
  images: readonly { id: string; url: string; alt: string; sortOrder: number }[],
): CatalogImageView[] {
  return images.map((image) => ({
    id: image.id,
    url: image.url,
    alt: image.alt,
    sortOrder: image.sortOrder,
  }));
}

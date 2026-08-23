/**
 * Katalog rasmlari — brauzer va server uchun umumiy turlar.
 *
 * ── Nima uchun ALOHIDA fayl ───────────────────────────────────────────
 * Xizmat fayli (`catalog-image.service.ts`) bazaga ulanadi va uni
 * brauzer kodiga qo'shib bo'lmaydi. Turlar esa ikkala tomonda ham
 * kerak: server ularni qaytaradi, sahifa ularni chizadi.
 *
 * Shuning uchun turlar bazadan MUSTAQIL faylda turadi.
 */

/** Bitta rasm — ro'yxatda va galereyada shu ko'rinishda ishlatiladi. */
export interface CatalogImageView {
  id: string;
  url: string;
  /** Ekranni o'quvchi dastur o'qiydigan matn. Hech qachon bo'sh emas. */
  alt: string;
  /** Tartib raqami: 0 — asosiy rasm. */
  sortOrder: number;
}

/**
 * Ro'yxatda ko'rsatiladigan qisqartirilgan rasm.
 *
 * ── Nima uchun TO'LIQ ro'yxat emas ────────────────────────────────────
 * Katalogda 40 ta mahsulot ko'rsatilsa va har biriga 8 tadan rasm
 * qo'shilsa, javobda 320 ta manzil ketardi — holbuki ekranda faqat
 * 40 tasi ko'rinadi.
 *
 * Shuning uchun ro'yxat so'rovlari faqat ASOSIY rasmni oladi.
 */
export interface CatalogThumb {
  url: string;
  alt: string;
}

/** Rasmlar bilan ishlash javoblari. */
export interface CatalogImagesResponse {
  images: CatalogImageView[];
}

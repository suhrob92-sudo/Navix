import { z } from 'zod';

/**
 * Saqlangan manzillar uchun validatsiya.
 *
 * Bu modul UMUMIY: taksi, ovqat yetkazish, kuryer va marketplace
 * modullari bir xil manzillardan foydalanadi. Shuning uchun u alohida
 * modul sifatida yozilgan va hech bir xizmatga bog'liq emas.
 */

/** Manzil turi — foydalanuvchi tez tanlashi uchun. */
export const ADDRESS_TYPE_OPTIONS = [
  { value: 'HOME', label: 'Uy' },
  { value: 'WORK', label: 'Ish' },
  { value: 'OTHER', label: 'Boshqa' },
] as const;

/**
 * Koordinatalar chegarasi.
 * Xarita bo'lmagani uchun foydalanuvchi qo'lda kiritishi mumkin —
 * shuning uchun mantiqiy chegaralarni tekshiramiz.
 */
const latitudeSchema = z.coerce
  .number({ message: "Kenglik raqam bo'lishi kerak" })
  .min(-90, "Kenglik -90 dan kichik bo'lishi mumkin emas")
  .max(90, "Kenglik 90 dan katta bo'lishi mumkin emas");

const longitudeSchema = z.coerce
  .number({ message: "Uzunlik raqam bo'lishi kerak" })
  .min(-180, "Uzunlik -180 dan kichik bo'lishi mumkin emas")
  .max(180, "Uzunlik 180 dan katta bo'lishi mumkin emas");

/**
 * Manzil maydonlari — standart (default) qiymatlarsiz.
 *
 * Nima uchun defaultsiz: `.partial()` chaqirilganda ham `.default()` ishlashda
 * davom etadi. Ya'ni bo'sh PATCH so'rovi `type: 'OTHER'` va `isDefault: false`
 * qiymatlarini yuborgan hisoblanardi va manzil turi bexosdan o'zgarib ketardi.
 * Shuning uchun standart qiymatlar faqat yaratish sxemasiga qo'shiladi.
 */
const addressFields = z.object({
  type: z.enum(['HOME', 'WORK', 'OTHER']),
  label: z.string().trim().min(2, 'Kamida 2 ta belgi kiriting').max(60, '60 ta belgidan oshmasligi kerak'),
  city: z.string().trim().min(2, 'Shaharni kiriting').max(100),
  district: z.string().trim().max(100).nullable().optional(),
  street: z.string().trim().min(2, "Ko'cha nomini kiriting").max(200),
  building: z.string().trim().max(50).nullable().optional(),
  apartment: z.string().trim().max(50).nullable().optional(),
  postalCode: z.string().trim().max(20).nullable().optional(),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  notes: z.string().trim().max(255, '255 ta belgidan oshmasligi kerak').nullable().optional(),
  /** Standart manzil — buyurtmalarda avtomatik tanlanadi. */
  isDefault: z.boolean(),
});

/** POST /api/v1/addresses */
export const createAddressSchema = addressFields.extend({
  type: addressFields.shape.type.default('OTHER'),
  isDefault: addressFields.shape.isDefault.default(false),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;

/** PATCH /api/v1/addresses/[id] — barcha maydonlar ixtiyoriy. */
export const updateAddressSchema = addressFields
  .partial()
  .refine((data) => Object.keys(data).length > 0, "O'zgartirish uchun kamida bitta maydon yuboring");

export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

/** Manzilni to'liq matn ko'rinishida yig'adi. */
export function formatAddressLine(address: {
  street: string;
  building?: string | null;
  apartment?: string | null;
  district?: string | null;
  city: string;
}): string {
  const parts = [
    address.street,
    address.building ? `${address.building}-uy` : null,
    address.apartment ? `${address.apartment}-xonadon` : null,
    address.district,
    address.city,
  ];

  return parts.filter(Boolean).join(', ');
}

/**
 * Taom tarkibi — yagona sozlama.
 *
 * ── Nima uchun bu kerak ───────────────────────────────────────────────
 * Odam "lag'mon" nima ekanini biladi. "Shef salati" da esa nima
 * borligini bilmaydi va ikki yo'ldan birini tanlaydi: buyurtma
 * qilmaydi, yoki qilib, kelganda hafsalasi pir bo'ladi.
 *
 * Ikkalasi ham yomon: birinchisida savdo yo'qoladi, ikkinchisida
 * ishonch.
 *
 * ── Nima uchun OG'IRLIK alohida muhim ─────────────────────────────────
 * Narxni solishtirishda eng muhim son aynan shu: 25 000 so'mlik
 * 150 grammlik porsiya va 25 000 so'mlik 400 grammlik porsiya
 * butunlay boshqa taklif.
 *
 * Og'irliksiz odam faqat narxga qaraydi va arzonini tanlab, kam
 * ovqat oladi.
 */

export type AllergenName =
  | 'GLUTEN'
  | 'DAIRY'
  | 'EGG'
  | 'NUTS'
  | 'PEANUT'
  | 'SEAFOOD'
  | 'FISH'
  | 'SOY'
  | 'SESAME';

/**
 * Allergenlar ro'yxati.
 *
 * ── Nima uchun yer yong'og'i ALOHIDA ──────────────────────────────────
 * Tibbiyotda yer yong'og'i (arachis) daraxt yong'oqlaridan ajratiladi:
 * unga bo'lgan reaksiya ancha kuchli va tez rivojlanadi.
 *
 * Ularni birlashtirish "yong'oq yeyman, lekin yer yong'og'i yolmayman"
 * degan odamga noto'g'ri ma'lumot berardi.
 */
export const ALLERGENS: readonly { value: AllergenName; label: string }[] = [
  { value: 'GLUTEN', label: 'Gluten' },
  { value: 'DAIRY', label: 'Sut mahsulotlari' },
  { value: 'EGG', label: 'Tuxum' },
  { value: 'NUTS', label: "Yong'oq" },
  { value: 'PEANUT', label: "Yer yong'og'i" },
  { value: 'SEAFOOD', label: 'Dengiz mahsulotlari' },
  { value: 'FISH', label: 'Baliq' },
  { value: 'SOY', label: 'Soya' },
  { value: 'SESAME', label: 'Kunjut' },
];

export const ALLERGEN_LABELS: Record<AllergenName, string> = Object.fromEntries(
  ALLERGENS.map((option) => [option.value, option.label]),
) as Record<AllergenName, string>;

/** Taomning tarkibi — hammasi ixtiyoriy. */
export interface MenuItemComposition {
  ingredients: string | null;
  /** GRAMMDA. */
  weightGrams: number | null;
  calories: number | null;
  allergens: AllergenName[];
}

/**
 * Tarkib haqida aytadigan gap bormi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Restoran maydonlarni to'ldirmagan bo'lishi mumkin. O'shanda
 * "Tarkibi: —" degan bo'sh bo'lim chizishdan ko'ra, uni umuman
 * ko'rsatmagan yaxshi.
 */
export function hasComposition(composition: MenuItemComposition): boolean {
  return (
    composition.ingredients !== null ||
    composition.weightGrams !== null ||
    composition.calories !== null ||
    composition.allergens.length > 0
  );
}

/**
 * Og'irlik va kaloriya — bitta qatorda.
 *
 * Ikkalasi ham kichik son va alohida qator egallashiga arzimaydi.
 * Bittasi yo'q bo'lsa, ikkinchisi yolg'iz ko'rsatiladi.
 */
export function formatPortion(weightGrams: number | null, calories: number | null): string | null {
  const parts: string[] = [];

  if (weightGrams !== null && weightGrams > 0) parts.push(`${weightGrams} g`);
  if (calories !== null && calories > 0) parts.push(`${calories} kkal`);

  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * Allergenlarni odam tiliga o'giradi.
 *
 * Noma'lum qiymat TASHLAB yuboriladi: bazaga kelajakda yangi tur
 * qo'shilsa, eski brauzer uni "undefined" deb ko'rsatmasligi kerak.
 */
export function describeAllergens(allergens: readonly string[]): string[] {
  return allergens.flatMap((value) =>
    value in ALLERGEN_LABELS ? [ALLERGEN_LABELS[value as AllergenName]] : [],
  );
}

/**
 * Mashhur taomlar ro'yxatida eng ko'pi bilan nechta.
 *
 * ── Nima uchun 6 ta ───────────────────────────────────────────────────
 * Uchtasi kam: odam tanlov yo'qligini sezadi. O'ntasi esa
 * "mashhur" so'zining ma'nosini yo'qotadi — u allaqachon menyuning
 * yarmi bo'lib qoladi.
 */
export const MAX_POPULAR_ITEMS = 6;

/**
 * Taom "mashhur" deb hisoblanishi uchun kamida nechta buyurtma.
 *
 * ── Nima uchun chegara bor ────────────────────────────────────────────
 * Bitta buyurtma tasodif bo'lishi mumkin. Uni "mashhur" deb
 * ko'rsatish odamni aldash bo'lardi — ayniqsa yangi restoranda,
 * u yerda bitta taom bitta buyurtma bilan birinchi o'ringa
 * chiqib qolardi.
 */
export const MIN_POPULAR_ORDERS = 3;

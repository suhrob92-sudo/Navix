/**
 * Mahsulot variantlari — brauzer va server uchun umumiy turlar.
 */

/** Tanlovning bitta qiymati. */
export interface OptionValueView {
  id: string;
  value: string;
}

/** Bitta tanlov: "Rang" va uning qiymatlari. */
export interface OptionView {
  id: string;
  name: string;
  values: OptionValueView[];
}

/** Mahsulotning aniq bir ko'rinishi. */
export interface VariantView {
  id: string;
  /** Narxlar TIYINDA. */
  price: number;
  oldPrice: number | null;
  stock: number;
  isActive: boolean;
  /** Qaysi qiymatlardan iborat — tugmalarni bog'lash uchun. */
  optionValueIds: string[];
  /** "Qora · 256 GB". */
  label: string;
}

/** Mahsulot sahifasi uchun to'liq ma'lumot. */
export interface VariantsView {
  options: OptionView[];
  variants: VariantView[];
}

/** Sotuvchi yuboradigan tanlov. */
export interface OptionInput {
  name: string;
  values: string[];
}

/** Sotuvchi yuboradigan variant. */
export interface VariantInput {
  /** Har bir tanlovdan bittadan qiymat — TANLOVLAR TARTIBIDA. */
  values: string[];
  priceSom: number;
  oldPriceSom: number | null;
  stock: number;
  isActive: boolean;
}

/** Bo'sh natija — variantsiz mahsulot uchun. */
export function emptyVariants(): VariantsView {
  return { options: [], variants: [] };
}

/**
 * Tanlangan qiymatlarga mos variantni topadi.
 *
 * ── Nima uchun bu funksiya BRAUZERDA ham kerak ────────────────────────
 * Odam rangni bosganda narx va zaxira DARHOL o'zgarishi kerak.
 * Serverdan so'rash 300-800 ms kutish demak va u har bosishda
 * takrorlanardi.
 *
 * Variantlar soni chegaralangan (`MAX_VARIANTS`), shuning uchun
 * qidiruv xotirada bemalol bajariladi.
 */
export function findVariant(
  variants: readonly VariantView[],
  selected: readonly string[],
): VariantView | null {
  if (selected.length === 0) return null;

  const wanted = new Set(selected);

  return (
    variants.find(
      (variant) =>
        variant.optionValueIds.length === wanted.size &&
        variant.optionValueIds.every((id) => wanted.has(id)),
    ) ?? null
  );
}

/**
 * Qiymatni UMUMAN sotib olish mumkinmi.
 *
 * ── HAQIQIY XATO: tanlovdan CHIQIB BO'LMASDI ──────────────────────────
 * Ilgari bu hisob boshqa tanlovlardagi tanlangan qiymatlarga ham
 * qarardi. Natijada quyidagi tuzoq paydo bo'lardi:
 *
 *   1. odam "Qora" va "128 GB" ni tanlaydi;
 *   2. "Oq" rangni bosmoqchi bo'ladi;
 *   3. lekin "Oq · 128 GB" birikmasi yo'q, shuning uchun "Oq"
 *      tugmasi O'CHIQ turadi;
 *   4. u "128 GB" ni ham almashtira olmaydi, chunki u tanlangan.
 *
 * Ya'ni odam oq rangni HECH QACHON ko'ra olmasdi.
 *
 * Endi qoida oddiy: qiymat sotuvda bo'lsa, tugma ochiq. Boshqa
 * tanlovlardagi mos kelmaydigan tanlov esa avtomatik BEKOR
 * QILINADI (`pruneSelection`).
 */
export function sellableValueIds(variants: readonly VariantView[]): Set<string> {
  const sellable = new Set<string>();

  for (const variant of variants) {
    if (!variant.isActive || variant.stock <= 0) continue;

    for (const id of variant.optionValueIds) sellable.add(id);
  }

  return sellable;
}

/**
 * Yangi qiymat tanlanganda mos kelmaydigan tanlovlarni bekor qiladi.
 *
 * ── Nima uchun BEKOR QILINADI, xato ko'rsatilmaydi ────────────────────
 * "Oq · 128 GB yo'q" degan xato texnik jihatdan to'g'ri, lekin
 * odam undan nima qilishni bilmaydi.
 *
 * Tanlovni jimgina bo'shatish esa tabiiy: u endi xotirani
 * qaytadan tanlaydi va faqat mumkin bo'lganlari ochiq turadi.
 */
export function pruneSelection(
  variants: readonly VariantView[],
  selected: readonly string[],
): string[] {
  if (selected.length <= 1) return [...selected];

  /** Barcha tanlangan qiymatlarni qamrab oladigan variant bormi. */
  const hasFullMatch = variants.some(
    (variant) =>
      variant.isActive && selected.every((id) => variant.optionValueIds.includes(id)),
  );

  if (hasFullMatch) return [...selected];

  /**
   * Mos kelmadi — ENG OXIRGI tanlov saqlanadi.
   *
   * Aynan uni odam hozir bosdi, ya'ni uning niyati shu. Qolganlari
   * bo'shatiladi va u ularni qaytadan tanlaydi.
   */
  return [selected[selected.length - 1]];
}

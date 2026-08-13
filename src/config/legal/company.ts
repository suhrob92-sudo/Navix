import { siteConfig } from '@/config/site';

/**
 * Tashkilotning rasmiy ma'lumotlari (rekvizitlar).
 *
 * ── Nima uchun ba'zilari `null` ───────────────────────────────────────
 * STIR, yuridik manzil va hisob raqami — davlat ro'yxatidan o'tgach
 * beriladigan HAQIQIY raqamlar. Ularni "vaqtincha" o'ylab yozib
 * qo'yish mumkin emas: ommaviy oferta — bu shartnoma va undagi
 * soxta rekvizit hujjatni haqiqiy emas qiladi, to'lov tizimlari
 * (Click, Payme) esa tekshiruvda aynan shu raqamlarni solishtiradi.
 *
 * Shuning uchun ular `null` turibdi. Sahifada bu holat YASHIRILMAYDI:
 * ochiq ogohlantirish chiqadi va hujjat qidiruv tizimlariga
 * berilmaydi. Ro'yxatdan o'tilgach shu YAGONA fayl to'ldiriladi —
 * hujjat matnlariga tegilmaydi.
 */
export interface LegalEntity {
  /** Yuridik shaxs nomi — masalan, «NAVIX» MChJ. */
  legalName: string | null;
  /** Soliq to'lovchining identifikatsiya raqami (STIR / INN). */
  taxId: string | null;
  /** Yuridik manzil. */
  address: string | null;
  /** Bank hisob raqami. */
  bankAccount: string | null;
  /** Bank nomi va MFO. */
  bankName: string | null;
  /** Davlat ro'yxatidan o'tganlik guvohnomasi raqami. */
  registrationNumber: string | null;
  /** Aloqa uchun elektron pochta — bu doim mavjud. */
  email: string;
  /** Qo'llab-quvvatlash ish vaqti. */
  supportHours: string;
  /** Ilova ishlaydigan mamlakat. */
  country: string;
}

export const LEGAL_ENTITY: LegalEntity = {
  legalName: null,
  taxId: null,
  address: null,
  bankAccount: null,
  bankName: null,
  registrationNumber: null,
  email: siteConfig.supportEmail,
  supportHours: 'Dushanba–Yakshanba, 09:00–21:00 (Toshkent vaqti)',
  country: "O'zbekiston Respublikasi",
};

/** Rekvizitlarning barchasi to'ldirilganmi. */
export function hasFullRequisites(entity: LegalEntity = LEGAL_ENTITY): boolean {
  return (
    entity.legalName !== null &&
    entity.taxId !== null &&
    entity.address !== null &&
    entity.bankAccount !== null &&
    entity.bankName !== null &&
    entity.registrationNumber !== null
  );
}

/**
 * Rekvizitlarni "nom — qiymat" juftliklari ko'rinishida beradi.
 *
 * To'ldirilmaganlari TUSHIB QOLADI: bo'sh qator o'rniga "—" chizish
 * hujjatni chala emas, ATAYLAB bo'sh qoldirilgandek ko'rsatardi.
 */
export function requisiteRows(entity: LegalEntity = LEGAL_ENTITY): readonly (readonly [string, string])[] {
  const rows: [string, string][] = [];

  if (entity.legalName) rows.push(['Yuridik shaxs', entity.legalName]);
  if (entity.registrationNumber) rows.push(["Ro'yxat raqami", entity.registrationNumber]);
  if (entity.taxId) rows.push(['STIR', entity.taxId]);
  if (entity.address) rows.push(['Yuridik manzil', entity.address]);
  if (entity.bankName) rows.push(['Bank', entity.bankName]);
  if (entity.bankAccount) rows.push(['Hisob raqami', entity.bankAccount]);

  rows.push(['Elektron pochta', entity.email]);
  rows.push(['Ish vaqti', entity.supportHours]);

  return rows;
}

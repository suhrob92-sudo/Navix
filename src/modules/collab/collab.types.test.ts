import { describe, expect, it } from 'vitest';

import {
  COLLAB_BOXES,
  COLLAB_STATUSES,
  COLLAB_STATUS_LABELS,
} from '@/modules/collab/collab.types';
import {
  COLLAB_MESSAGE_MAX_LENGTH,
  COLLAB_SUBJECT_MAX_LENGTH,
  collabQuerySchema,
  createCollabOfferSchema,
  creatorsQuerySchema,
  respondCollabOfferSchema,
} from '@/modules/collab/collab.schemas';

/**
 * Hamkorlik — biznes va ijodkorni ulaydigan modul.
 *
 * Bu yerdagi qoidalarning ko'pi SPAMGA qarshi: taklif oson
 * yuborilsa, "hamkorlikka ochiq" degan belgi ijodkorni ochiq
 * nishonga aylantirardi.
 */
describe('COLLAB_STATUS_LABELS', () => {
  it('HAR BIR holat uchun nom bor', () => {
    /*
      Nomsiz holat ekranda bo'sh doira bo'lib turardi va odam
      taklif qaysi bosqichda ekanini bilmasdi.
    */
    for (const status of COLLAB_STATUSES) {
      expect(COLLAB_STATUS_LABELS[status]).toBeTruthy();
    }

    expect(Object.keys(COLLAB_STATUS_LABELS)).toHaveLength(COLLAB_STATUSES.length);
  });

  it('nomlar TAKRORLANMAYDI', () => {
    // Ikki holat bir xil yozilsa, ular ajratib bo'lmas holga kelardi.
    const labels = COLLAB_STATUSES.map((status) => COLLAB_STATUS_LABELS[status]);

    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('createCollabOfferSchema', () => {
  const valid = {
    username: 'bobur_k',
    subject: 'Restoran haqida video',
    message: "Restoranimiz haqida bitta video kerak. Shartlarni gaplashamiz.",
  };

  it("to'g'ri taklifni qabul qiladi", () => {
    expect(createCollabOfferSchema.safeParse(valid).success).toBe(true);
  });

  it("BO'SH matnli taklif rad etiladi", () => {
    /*
      "Hamkorlik qilamizmi?" degan bo'sh taklif javob berib
      bo'lmaydigan savol. Ijodkorga qaror uchun shart kerak.
    */
    expect(createCollabOfferSchema.safeParse({ ...valid, message: 'Salom' }).success).toBe(false);
    expect(createCollabOfferSchema.safeParse({ ...valid, message: '   ' }).success).toBe(false);
  });

  it('juda qisqa sarlavha rad etiladi', () => {
    expect(createCollabOfferSchema.safeParse({ ...valid, subject: 'a' }).success).toBe(false);
  });

  it('juda uzun matn rad etiladi', () => {
    expect(
      createCollabOfferSchema.safeParse({
        ...valid,
        message: 'x'.repeat(COLLAB_MESSAGE_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
    expect(
      createCollabOfferSchema.safeParse({
        ...valid,
        subject: 'x'.repeat(COLLAB_SUBJECT_MAX_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it("noto'g'ri foydalanuvchi nomi rad etiladi", () => {
    // Nom manzilga tushadi — tekshirilmasa u buzuq havola yasardi.
    expect(createCollabOfferSchema.safeParse({ ...valid, username: 'a b' }).success).toBe(false);
    expect(createCollabOfferSchema.safeParse({ ...valid, username: '../x' }).success).toBe(false);
  });

  it('nom kichik harfga keltiriladi', () => {
    const result = createCollabOfferSchema.safeParse({ ...valid, username: 'Bobur_K' });

    expect(result.success && result.data.username).toBe('bobur_k');
  });
});

describe('respondCollabOfferSchema', () => {
  it('uchala amalni qabul qiladi', () => {
    for (const action of ['ACCEPT', 'DECLINE', 'WITHDRAW']) {
      expect(respondCollabOfferSchema.safeParse({ action }).success).toBe(true);
    }
  });

  it("noma'lum amal rad etiladi", () => {
    expect(respondCollabOfferSchema.safeParse({ action: 'DELETE' }).success).toBe(false);
  });
});

describe('collabQuerySchema', () => {
  it("sukut bo'yicha KELGAN quti ochiladi", () => {
    /*
      Kelgan takliflar harakat talab qiladi, yuborilganlar esa
      faqat kutishni. Birinchi ochilganda muhimrog'i ko'rinishi
      kerak.
    */
    expect(collabQuerySchema.parse({}).box).toBe('IN');
  });

  it('ikkala quti ham qabul qilinadi', () => {
    for (const box of COLLAB_BOXES) {
      expect(collabQuerySchema.safeParse({ box }).success).toBe(true);
    }
  });

  it("noma'lum quti rad etiladi", () => {
    expect(collabQuerySchema.safeParse({ box: 'ARCHIVE' }).success).toBe(false);
  });
});

describe('creatorsQuerySchema', () => {
  it("so'rovsiz ham ishlaydi", () => {
    /*
      Majburiy qilsak, katalog birinchi ochilganda bo'm-bo'sh
      turardi va biznes "bu yerda hech kim yo'q" deb chiqib
      ketardi.
    */
    const result = creatorsQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.success && result.data.q).toBeUndefined();
  });

  it('chegara cheklangan', () => {
    // Cheksiz chegara bilan butun bazani bir so'rovda olish mumkin bo'lardi.
    expect(creatorsQuerySchema.safeParse({ limit: 500 }).success).toBe(false);
  });
});

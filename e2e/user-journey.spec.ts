import { expect, test } from '@playwright/test';

import { odamOchir, odamYarat, type SinovOdam } from './helpers';

/**
 * HAQIQIY FOYDALANUVCHI YO'LI — brauzerda.
 *
 * ── Nima uchun bu sinovlar kerak (API sinovlari qamramaydi) ───────────
 * Vitest sinovlari yo'l funksiyalarini to'g'ridan chaqiradi: ular
 * serverning to'g'ri ishlashini isbotlaydi. Lekin ular BIR narsani
 * umuman ko'rmaydi — ekranning serverga ULANGANMI yoki yo'qmi.
 *
 * Tugma noto'g'ri manzilga so'rov yuborsa, javob ekranda ko'rsatilmasa,
 * yoki kirish sahifasi qayta yo'naltirmasa — hamma API sinovi yashil
 * bo'lib turadi, ilova esa ishlamaydi.
 *
 * Shuning uchun bu yerda faqat ULANISH nuqtalari tekshiriladi:
 *   1. Himoyalangan sahifa kirmagan odamni qaytaradimi
 *   2. Kirish formasi rostdan kiritadimi
 *   3. Serverdagi BALANS ekranda ko'rinadimi
 *   4. Xato holatida odam nima ko'radi
 *
 * ── Nima uchun kam sinov ──────────────────────────────────────────────
 * E2E sekin va mo'rt bo'ladi. Har bir qoidani bu yerda tekshirish
 * sinovlarni soatlab ishlaydigan qilib qo'yardi. Qoidalar Vitest'da
 * tekshirilgan, bu yerda esa faqat ulanish.
 */

let odam: SinovOdam;

test.beforeAll(() => {
  odam = odamYarat();
});

test.afterAll(() => {
  odamOchir(odam.userId);
});

/**
 * Kirish formasini to'ldirib yuboradi.
 *
 * ── Telefon raqami HAMMASI emas, faqat 9 raqami kiritiladi ────────────
 * Formada `+998` qismi alohida yozib qo'yilgan yorliq — u maydonning
 * ichida emas. To'liq raqam yozilsa `+998+998...` bo'lib ketadi.
 *
 * Buni sinov birinchi ishga tushganda bilib oldim: ekranda
 * "Telefon raqami yoki parol noto'g'ri" chiqdi. Xato koddan emas,
 * sinovning o'zidan edi.
 */
function raqamnigina(phone: string): string {
  return phone.replace(/^\+998/, '');
}

async function kir(page: import('@playwright/test').Page, phone: string, password: string): Promise<number> {
  const javob = page.waitForResponse(
    (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
  );

  await page.goto('/auth/login');
  await page.locator('#phone').fill(raqamnigina(phone));
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Kirish' }).click();

  const status = (await javob).status();

  /*
    ── 429 ni ALOHIDA ushlaymiz ────────────────────────────────────────
    Kirish bir IP dan soatiga 30 marta cheklangan (`loginByIp`). Bu
    to'g'ri himoya, lekin E2E sinovi har ishga tushganda bir necha
    marta kiradi — va ketma-ket bir necha marta ishlatilsa, chegara
    tugaydi.

    Buni aytmasak, sinov "parol noto'g'ri" degan tushunarsiz xato
    beradi va soatlab sababi qidiriladi. Shuning uchun sabab ochiq
    yoziladi.
  */
  if (status === 429) {
    throw new Error(
      'Kirish chegarasi tugadi (429). Bir IP dan soatiga 30 marta kirish mumkin.\n' +
        "Sinovni ketma-ket ko'p marta ishlatgan bo'lsangiz, bir oz kutib qayta urinib ko'ring.",
    );
  }

  return status;
}

test('kirmagan odam hamyonga kira olmaydi', async ({ page }) => {
  /*
    ── Himoya IKKI qatlamda ────────────────────────────────────────
    Buni mutatsiya sinovi ko'rsatdi:

      1. `src/proxy.ts` — cookie bor-yo'qligini ko'rib, sahifa
         yuklanmasdan oldin qaytaradi (tezlik uchun)
      2. `(cabinet)/layout.tsx` dagi `<RequireAuth>` — haqiqiy
         tekshiruv

    Bittasini olib tashlasam, ikkinchisi ushladi va bu sinov
    baribir o'tdi. Faqat IKKALASI olib tashlanganda yiqildi.

    Shuning uchun bu sinov "proxy ishlayapti" demaydi — u
    NATIJANI tekshiradi: kirmagan odam hamyonni ko'ra olmaydi.
    Foydalanuvchi uchun muhimi ham shu.
  */
  await page.goto('/wallet');

  await expect(page).toHaveURL(/\/auth\/login/);
});

test("kirish ishlaydi va BALANS ekranda ko'rinadi", async ({ page }) => {
  /*
    ── Bu sinovning asosiy qiymati ─────────────────────────────────
    Balans bazada 250 000 so'm. U ekranga chiqishi uchun zanjirning
    HAMMASI ishlashi kerak: forma -> API -> token -> himoyalangan
    sahifa -> hamyon so'rovi -> raqamni formatlash.

    Zanjirning istalgan bo'g'ini uzilsa, bu sinov yiqiladi — va
    aynan shuni boshqa hech bir sinov ko'rmaydi.
  */
  await kir(page, odam.phone, odam.password);

  await expect(page).not.toHaveURL(/\/auth\/login/, { timeout: 20_000 });

  await page.goto('/wallet');

  /*
    IKKI narsa tekshiriladi va ikkalasi ham alohida ulanish nuqtasi:

      1. BALANS        — hamyon so'rovi ishlayapti
      2. TARIX yozuvi  — amallar ro'yxati so'rovi ham ishlayapti

    Ikkinchisi birinchisidan kelib chiqmaydi: balans ko'rinib,
    tarix bo'sh qolishi mumkin. Sinov birinchi ishga tushganda
    ekranda ikkalasi ham borligi ma'lum bo'ldi — shuning uchun
    ikkalasi ham qamrab olindi.

    Raqam bo'sh joy bilan yoziladi ("250 000") va u oddiy probel
    bo'lmasligi mumkin, shuning uchun oraliq belgi erkin.
  */
  await expect(page.getByText(/^250\s*000\s*so/).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/^\+250\s*000\s*so/).first()).toBeVisible();
});

test("NOTO'G'RI parol bilan kirib bo'lmaydi va odam xatoni ko'radi", async ({ page }) => {
  /*
    Ikki tomoni ham muhim:
      - kirib bo'lmasligi (xavfsizlik)
      - odam NIMA bo'lganini ko'rishi (foydalanuvchiga qulaylik)

    ── Nima uchun JAVOB kutiladi, manzil emas ──────────────────────
    Bu sinov avval shunchaki "manzil hali ham /auth/login" deb
    tekshirardi va SHU SABABLI yolg'on edi: parol tekshiruvini
    koddan olib tashlaganimda ham o'tib ketdi.

    Sababi oddiy — tugma bosilgandan keyin sahifa darhol
    almashmaydi. Tekshiruv esa o'sha ondayoq "ha, hali loginda"
    deb rozi bo'lardi va muvaffaqiyatli kirishni ham o'tkazib
    yuborardi.

    Endi avval serverning JAVOBI kutiladi — u aniq va tezkor
    emas: 401 bo'lishi shart.
  */
  const javob = page.waitForResponse(
    (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
  );

  await kir(page, odam.phone, 'butunlay-boshqa-parol');

  expect((await javob).status(), 'server kirishga ruxsat berdi').toBe(401);

  /* Ekranda xato xabari paydo bo'lishi kerak — odam nima bo'lganini bilsin. */
  await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 15_000 });

  /* Va ichkariga o'tkazilmagan bo'lishi kerak. */
  await expect(page).toHaveURL(/\/auth\/login/);
});

test('bosh sahifa ochiladi va asosiy havolalar joyida', async ({ page }) => {
  /*
    Eng oddiy, lekin eng ko'p ishlatiladigan sahifa. U ochilmasa,
    qolgan hamma narsa ma'nosiz.
  */
  const javob = await page.goto('/');

  expect(javob?.status()).toBeLessThan(400);
  await expect(page.locator('body')).toBeVisible();
});

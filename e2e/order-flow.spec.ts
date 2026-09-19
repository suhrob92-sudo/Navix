import { expect, test } from '@playwright/test';

import { odamOchir, odamYarat, type SinovOdam } from './helpers';

/**
 * XARID YO'LI — savatdan to'lovgacha, brauzerda.
 *
 * ── Nima uchun bu alohida sinov ───────────────────────────────────────
 * `user-journey.spec.ts` kirish va hamyonni tekshiradi. Bu yerda esa
 * ilovaning PUL TOPADIGAN yo'li: odam mahsulot tanlaydi, savatga
 * qo'shadi va to'laydi.
 *
 * Bu yo'l ko'p bo'lakdan iborat va har biri alohida so'rov yuboradi:
 * mahsulot sahifasi, savat (brauzerda saqlanadi), manzil, narx
 * hisobi, buyurtma yaratish, hamyondan yechish. Vitest sinovlari
 * oxirgi ikkitasini qamraydi — qolgani faqat shu yerda ko'rinadi.
 *
 * ── Nima uchun BITTA yo'l ─────────────────────────────────────────────
 * Har modul uchun alohida E2E yozish sinovlarni soatlab ishlaydigan
 * qilardi. Bozor tanlandi, chunki u eng ko'p bo'lakdan iborat:
 * ovqat va boshqalar ham xuddi shu naqshda ishlaydi.
 */

/**
 * Sinov mahsuloti — arzon va zaxirasi ko'p.
 *
 * Narx sinovga YOZILMAYDI: u ekrandan o'qiladi va hamyondagi
 * o'zgarish bilan solishtiriladi. Shunda seed o'zgarsa ham sinov
 * to'g'ri qoladi, faqat mahsulot yo'qolsa yiqiladi — va bu to'g'ri,
 * chunki unda sinov nimani tekshirayotganini bilmay qoladi.
 */
const MAHSULOT = '/marketplace/p/sariq-devni-minib';

/** Sinov restorani — eng kam buyurtma summasi past. */
const RESTORAN = '/food/milliy-taomlar';

let odam: SinovOdam;

test.beforeAll(() => {
  odam = odamYarat();
});

test.afterAll(() => {
  odamOchir(odam.userId);
});

/** Matndan so'mdagi sonni ajratib oladi: "77 000 so'm" -> 77000 */
function somOqi(matn: string): number {
  const m = matn.replace(/ /g, ' ').match(/([\d\s]+)\s*so/i);

  if (!m) throw new Error(`Summani o'qib bo'lmadi: "${matn}"`);

  return Number(m[1]!.replace(/\s/g, ''));
}

/** Berilgan odam nomidan kiradi. */
async function kirOdam(page: import('@playwright/test').Page, kim: SinovOdam): Promise<void> {
  const javob = page.waitForResponse(
    (r) => r.url().includes('/api/v1/auth/login') && r.request().method() === 'POST',
  );

  await page.goto('/auth/login');
  await page.locator('#phone').fill(kim.phone.replace(/^\+998/, ''));
  await page.locator('#password').fill(kim.password);
  await page.getByRole('button', { name: 'Kirish' }).click();

  const status = (await javob).status();

  if (status === 429) {
    throw new Error('Kirish chegarasi tugadi (429). Bir IP dan soatiga 30 marta kirish mumkin.');
  }

  expect(status, 'kirib bo‘lmadi').toBe(200);
}

/** Fayl bo'ylab umumiy foydalanuvchi nomidan kiradi. */
async function kir(page: import('@playwright/test').Page): Promise<void> {
  return kirOdam(page, odam);
}

test('mahsulotni savatga qo‘shib, buyurtma berish va hamyondan pul yechilishi', async ({ page }) => {
  await kir(page);

  /* ── 1. Boshlang'ich balans ─────────────────────────────────────── */
  await page.goto('/wallet');
  const balansOldin = somOqi(
    await page
      .getByText(/^\d[\d\s]*\s*so/)
      .first()
      .innerText(),
  );

  /* ── 2. Mahsulotni savatga qo'shish ─────────────────────────────── */
  await page.goto(MAHSULOT);
  await page.getByRole('button', { name: "Savatga qo'shish" }).click();

  /* ── 3. Savatda JAMI summani o'qish ─────────────────────────────── */
  await page.goto('/marketplace/cart');

  const buyurtmaTugma = page.getByRole('button', { name: /buyurtma berish/i });

  await expect(buyurtmaTugma, 'savat bo‘sh yoki manzil yo‘q').toBeVisible({ timeout: 20_000 });

  const jami = somOqi(await buyurtmaTugma.innerText());

  expect(jami, 'jami summa mantiqsiz').toBeGreaterThan(0);

  /* ── 4. Buyurtma berish ─────────────────────────────────────────── */
  const javob = page.waitForResponse(
    (r) => r.url().includes('/api/v1/market/orders') && r.request().method() === 'POST',
  );

  await buyurtmaTugma.click();

  expect((await javob).status(), 'buyurtma yaratilmadi').toBe(201);

  /* ── 5. Hamyondan AYNAN o'sha summa yechilgan bo'lishi kerak ────── */
  await page.goto('/wallet');

  const balansKeyin = somOqi(
    await page
      .getByText(/^\d[\d\s]*\s*so/)
      .first()
      .innerText(),
  );

  expect(balansOldin - balansKeyin, 'yechilgan summa savatdagidan farq qildi').toBe(jami);
});

test('buyurtma RO‘YXATDA ko‘rinadi', async ({ page }) => {
  /*
    Buyurtma yaratilgani yetarli emas: odam uni keyin topa olishi
    kerak. Ro'yxat bo'sh qolsa, mijoz "pulim ketdi, buyurtma yo'q"
    deb qo'ng'iroq qilardi.

    Yuqoridagi sinov buyurtma yaratadi, bu esa o'shani ko'radi —
    shuning uchun tartib muhim va fayl ketma-ket ishlaydi
    (`fullyParallel: false`).
  */
  await kir(page);

  await page.goto('/marketplace/orders');

  await expect(page.getByText(/Kitob Dunyosi/i).first()).toBeVisible({ timeout: 20_000 });
});

test('OVQAT: taomni savatga qo\u2018shib, buyurtma berish', async ({ page }) => {
  /*
    ── Nima uchun bozordan keyin bu ham kerak ──────────────────────────
    Ikkala modul ham savatni BRAUZERDA saqlaydi, lekin boshqacha:
    bozor savati serverga sinxronlanadi, ovqat savati esa faqat
    `localStorage` da yashaydi va so'rov tanasi boshqa joyda yasaladi.

    Bozorda aynan shu joyda xato bor edi (`variantId: null`), shuning
    uchun ikkinchi modul ham tekshiriladi.
  */
  await kir(page);

  await page.goto('/wallet');
  const balansOldin = somOqi(
    await page
      .getByText(/^\d[\d\s]*\s*so/)
      .first()
      .innerText(),
  );

  /*
    Tugma `aria-label` bo'yicha tanlanadi.

    ── Nima uchun (sinov yozayotib yo'l qo'ygan xato) ──────────────────
    Avval oddiy "Qo'shish" matni bo'yicha qidirgandim va sinov
    SEVIMLILARGA qo'shish tugmasini bosgan edi — savat esa bo'sh
    qolaverardi. Ikkala tugmaning nomida ham "qo'shish" bor.
  */
  await page.goto(RESTORAN);
  await page
    .getByRole('button', { name: /savatga qo.shish/i })
    .first()
    .click();

  await page.goto('/food/cart');

  const buyurtmaTugma = page.getByRole('button', { name: /buyurtma berish/i });

  await expect(buyurtmaTugma, 'savat bo\u2018sh yoki manzil yo\u2018q').toBeVisible({ timeout: 20_000 });

  const jami = somOqi(await buyurtmaTugma.innerText());

  const javob = page.waitForResponse(
    (r) => r.url().includes('/api/v1/food/orders') && r.request().method() === 'POST',
  );

  await buyurtmaTugma.click();

  expect((await javob).status(), 'buyurtma yaratilmadi').toBe(201);

  await page.goto('/wallet');

  const balansKeyin = somOqi(
    await page
      .getByText(/^\d[\d\s]*\s*so/)
      .first()
      .innerText(),
  );

  expect(balansOldin - balansKeyin, 'yechilgan summa savatdagidan farq qildi').toBe(jami);
});

test('MEHMONXONA: xona band qilish va hamyondan pul yechilishi', async ({ page }) => {
  /*
    ── Uchinchi naqsh: FORMA ───────────────────────────────────────────
    Bozor va ovqatda so'rov savatdan yasaladi. Mehmonxonada esa
    oynachadagi formadan: sanalar, mehmonlar soni, ism va telefon.

    Ya'ni bu boshqa kod yo'li va u alohida tekshirilishi kerak.
  */
  const mehmon = odamYarat(1_000_000);

  try {
    await kirOdam(page, mehmon);

    await page.goto('/wallet');
    const balansOldin = somOqi(
      await page
        .getByText(/^\d[\d\s]*\s*so/)
        .first()
        .innerText(),
    );

    /*
      Sana TASODIFIY tanlanadi.

      Xonalar soni cheklangan (bu yerda 5 ta). Har safar bir xil sana
      ishlatilsa, sinov bir necha marta ishlaganda joy tugab qolardi —
      va sabab koddan emas, sinovning o'zidan bo'lardi.
    */
    const boshlanish = new Date();
    boshlanish.setUTCDate(boshlanish.getUTCDate() + 60 + Math.floor(Math.random() * 120));

    const tugash = new Date(boshlanish);
    tugash.setUTCDate(tugash.getUTCDate() + 2);

    const kun = (d: Date) => d.toISOString().slice(0, 10);

    await page.goto(`/hotel/buxoro-karvon?checkIn=${kun(boshlanish)}&checkOut=${kun(tugash)}`);

    await page.getByRole('button', { name: 'Band qilish' }).last().click();

    await page.locator('#guestName').fill('Sinov Mehmon');
    await page.locator('#guestPhone').fill('901112233');

    const javob = page.waitForResponse(
      (r) => r.url().includes('/api/v1/hotels/bookings') && r.request().method() === 'POST',
    );

    await page.getByRole('button', { name: 'Tasdiqlash' }).click();

    expect((await javob).status(), 'bandlov yaratilmadi').toBe(201);

    /* Ekranda tasdiq ko'rinishi kerak — odam nima bo'lganini bilsin. */
    await expect(page.getByText(/band qilindi/i).first()).toBeVisible({ timeout: 15_000 });

    await page.goto('/wallet');

    const balansKeyin = somOqi(
      await page
        .getByText(/^\d[\d\s]*\s*so/)
        .first()
        .innerText(),
    );

    /* 2 kecha x 190 000 = 380 000 so'm. Narx xonadan keladi, sinovga yozilmagan. */
    expect(balansOldin - balansKeyin, 'pul yechilmadi yoki summa noto\u2018g\u2018ri').toBeGreaterThan(0);
    expect(balansOldin - balansKeyin).toBe(380_000);
  } finally {
    odamOchir(mehmon.userId);
  }
});

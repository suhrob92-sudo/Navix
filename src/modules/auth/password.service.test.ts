import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '@/modules/auth/password.service';

describe('Parol xizmati', () => {
  it("hash ochiq parolni o'zida saqlamaydi", async () => {
    const password = 'parol1234';
    const hash = await hashPassword(password);

    expect(hash).not.toContain(password);
    expect(hash.startsWith('$2')).toBe(true);
  });

  it("bir xil parol har safar boshqa hash beradi (tuz qo'shiladi)", async () => {
    const first = await hashPassword('parol1234');
    const second = await hashPassword('parol1234');

    expect(first).not.toBe(second);
  });

  it("to'g'ri parolni tasdiqlaydi", async () => {
    const hash = await hashPassword('parol1234');

    expect(await verifyPassword('parol1234', hash)).toBe(true);
  });

  it("noto'g'ri parolni rad etadi", async () => {
    const hash = await hashPassword('parol1234');

    expect(await verifyPassword('boshqa1234', hash)).toBe(false);
  });

  it("hash bo'lmasa false qaytaradi va yiqilmaydi", async () => {
    expect(await verifyPassword('parol1234', null)).toBe(false);
  });

  it('katta-kichik harfni farqlaydi', async () => {
    const hash = await hashPassword('Parol1234');

    expect(await verifyPassword('parol1234', hash)).toBe(false);
  });
}, 30_000);

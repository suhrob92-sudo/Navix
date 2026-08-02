import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

import { ValidationError } from '@/lib/api/errors';
import { serverEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { maskUzPhone } from '@/lib/phone';
import { getRedis } from '@/lib/redis';
import { getSmsSender } from '@/lib/sms';

/**
 * SMS tasdiqlash kodi (OTP — One Time Password) xizmati.
 *
 * Nima uchun Redis'da saqlanadi:
 *  - Kod qisqa umrli (5 daqiqa) — Redis muddat tugagach o'zi o'chiradi;
 *  - Juda tez ishlaydi — har tekshirishda bazaga murojaat qilinmaydi;
 *  - Bazani keraksiz yozuvlar bilan to'ldirmaydi.
 *
 * Xavfsizlik choralari:
 *  - Kodning o'zi emas, hash'i saqlanadi;
 *  - Noto'g'ri urinishlar sanaladi va chegaradan oshsa kod bekor qilinadi;
 *  - Solishtirish `timingSafeEqual` bilan — javob vaqtidan kod topib bo'lmaydi;
 *  - Qayta yuborish uchun kutish vaqti (cooldown) mavjud.
 */

/** Kod qaysi maqsadda yuborilgani. Har biri alohida saqlanadi. */
export const OtpPurpose = {
  /** Ro'yxatdan o'tishda telefon raqamini tasdiqlash. */
  PHONE_VERIFICATION: 'phone_verification',
  /** Parolni tiklash. */
  PASSWORD_RESET: 'password_reset',
} as const;

export type OtpPurposeValue = (typeof OtpPurpose)[keyof typeof OtpPurpose];

interface StoredOtp {
  codeHash: string;
  attempts: number;
  createdAt: number;
}

function otpKey(purpose: OtpPurposeValue, phone: string): string {
  return `navix:otp:${purpose}:${phone}`;
}

function cooldownKey(purpose: OtpPurposeValue, phone: string): string {
  return `navix:otp:cooldown:${purpose}:${phone}`;
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/** 6 xonali tasodifiy kod. `randomInt` — kriptografik jihatdan xavfsiz. */
function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Ikki hash'ni vaqt bo'yicha xavfsiz solishtiradi. */
function isSameHash(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'hex');
  const bufferB = Buffer.from(b, 'hex');

  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/** Foydalanuvchiga yuboriladigan SMS matni. */
function buildSmsText(code: string, purpose: OtpPurposeValue): string {
  const minutes = Math.round(serverEnv().OTP_TTL / 60);

  return purpose === OtpPurpose.PASSWORD_RESET
    ? `Navix: parolni tiklash kodi ${code}. Kod ${minutes} daqiqa amal qiladi. Kodni hech kimga bermang.`
    : `Navix: tasdiqlash kodi ${code}. Kod ${minutes} daqiqa amal qiladi. Kodni hech kimga bermang.`;
}

export interface OtpIssueResult {
  /** Kod qachongacha amal qiladi (soniyalarda). */
  expiresInSeconds: number;
  /** Qayta yuborishgacha qancha kutish kerak (soniyalarda). */
  resendAfterSeconds: number;
}

/**
 * Yangi kod yaratadi, SMS orqali yuboradi va Redis'ga yozadi.
 *
 * @throws {ValidationError} qayta yuborish vaqti hali kelmagan bo'lsa
 */
export async function issueOtp(phone: string, purpose: OtpPurposeValue): Promise<OtpIssueResult> {
  const env = serverEnv();
  const redis = getRedis();

  // 1. Qayta yuborish vaqti kelganini tekshiramiz.
  const remainingCooldown = await redis.ttl(cooldownKey(purpose, phone));
  if (remainingCooldown > 0) {
    throw new ValidationError(`Yangi kod so'rash uchun ${remainingCooldown} soniya kuting`);
  }

  // 2. Kod yaratamiz va saqlaymiz.
  const code = generateCode();
  const record: StoredOtp = { codeHash: hashCode(code), attempts: 0, createdAt: Date.now() };

  await redis.set(otpKey(purpose, phone), JSON.stringify(record), 'EX', env.OTP_TTL);
  await redis.set(cooldownKey(purpose, phone), '1', 'EX', env.OTP_RESEND_COOLDOWN);

  // 3. SMS yuboramiz.
  try {
    await getSmsSender().send({ to: phone, text: buildSmsText(code, purpose) });
  } catch (error) {
    // SMS yuborilmasa saqlangan kodni o'chiramiz — foydalanuvchi qayta so'ray olsin.
    await redis.del(otpKey(purpose, phone), cooldownKey(purpose, phone));
    throw error;
  }

  logger.info({ phone: maskUzPhone(phone), purpose }, 'Tasdiqlash kodi yuborildi');

  return { expiresInSeconds: env.OTP_TTL, resendAfterSeconds: env.OTP_RESEND_COOLDOWN };
}

/**
 * Kiritilgan kodni tekshiradi. To'g'ri bo'lsa kodni o'chiradi (bir marta ishlatiladi).
 *
 * @throws {ValidationError} kod noto'g'ri, eskirgan yoki urinishlar tugagan bo'lsa
 */
export async function verifyOtp(phone: string, code: string, purpose: OtpPurposeValue): Promise<void> {
  const env = serverEnv();
  const redis = getRedis();
  const key = otpKey(purpose, phone);

  const raw = await redis.get(key);
  if (!raw) {
    throw new ValidationError("Kod muddati tugagan yoki topilmadi. Yangi kod so'rang.");
  }

  const record = JSON.parse(raw) as StoredOtp;

  if (!isSameHash(record.codeHash, hashCode(code))) {
    const attempts = record.attempts + 1;

    if (attempts >= env.OTP_MAX_ATTEMPTS) {
      // Chegaraga yetdi — kodni bekor qilamiz, yangisini so'rash kerak.
      await redis.del(key);
      logger.warn({ phone: maskUzPhone(phone), purpose }, 'OTP urinishlari tugadi, kod bekor qilindi');
      throw new ValidationError("Juda ko'p noto'g'ri urinish. Yangi kod so'rang.");
    }

    // Qolgan muddatni saqlab qolgan holda urinishlar sonini yangilaymiz.
    const ttl = await redis.ttl(key);
    await redis.set(key, JSON.stringify({ ...record, attempts }), 'EX', ttl > 0 ? ttl : env.OTP_TTL);

    const left = env.OTP_MAX_ATTEMPTS - attempts;
    throw new ValidationError(`Kod noto'g'ri. Yana ${left} ta urinish qoldi.`);
  }

  // Kod to'g'ri — darhol o'chiramiz, ikkinchi marta ishlatib bo'lmasin.
  await redis.del(key);
}

/** Kodni bekor qiladi (masalan foydalanuvchi jarayonni bekor qilganda). */
export async function revokeOtp(phone: string, purpose: OtpPurposeValue): Promise<void> {
  await getRedis().del(otpKey(purpose, phone), cooldownKey(purpose, phone));
}

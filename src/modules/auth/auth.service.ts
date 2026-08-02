import { ConflictError, UnauthorizedError, ValidationError } from '@/lib/api/errors';
import { AuditAction, recordAudit } from '@/lib/audit';
import { serverEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { maskUzPhone } from '@/lib/phone';
import { prisma } from '@/lib/prisma';
import { enforceRateLimit, resetRateLimit } from '@/lib/rate-limit';
import type { RoleValue } from '@/config/rbac';
import type { LoginInput, RegisterInput, ResetPasswordInput, VerifyOtpInput } from '@/modules/auth/auth.schemas';
import { OtpPurpose, issueOtp, verifyOtp } from '@/modules/auth/otp.service';
import { hashPassword, verifyPassword } from '@/modules/auth/password.service';
import { createSession, revokeAllSessions, type DeviceInfo, type TokenPair } from '@/modules/auth/session.service';

/**
 * Autentifikatsiyaning asosiy biznes logikasi.
 *
 * Bu qatlam HTTP haqida hech narsa bilmaydi — u faqat "nima bo'lishi kerak"
 * ni hal qiladi. HTTP bilan ishlash API route'larida qoladi.
 * Shu sababli bu funksiyalarni kelajakda mobil ilova yoki cron ham
 * to'g'ridan-to'g'ri chaqira oladi.
 */

export interface AuthUserPayload {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: string;
  roles: RoleValue[];
}

interface AuditContext extends DeviceInfo {
  requestId?: string;
}

/** Foydalanuvchi yozuvini API javobi uchun tayyorlaydi (maxfiy maydonlarsiz). */
function toAuthUser(user: {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  status: string;
  roles: { role: { name: string } }[];
}): AuthUserPayload {
  return {
    id: user.id,
    phone: user.phone,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    status: user.status,
    roles: user.roles.map((assignment) => assignment.role.name as RoleValue),
  };
}

const USER_SELECT = {
  id: true,
  phone: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  status: true,
  passwordHash: true,
  deletedAt: true,
  roles: { select: { role: { select: { name: true } } } },
} as const;

// ---------------------------------------------------------------------------
// Ro'yxatdan o'tish
// ---------------------------------------------------------------------------

export interface RegisterResult {
  phone: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

/**
 * Yangi foydalanuvchini yaratadi va telefon raqamiga tasdiqlash kodi yuboradi.
 *
 * Hisob darhol faol bo'lmaydi — avval `PENDING_VERIFICATION` holatida turadi.
 * Faqat kod tasdiqlangach `ACTIVE` bo'ladi.
 */
export async function register(input: RegisterInput, context: AuditContext): Promise<RegisterResult> {
  await enforceRateLimit('register', context.ipAddress ?? input.phone);

  const existing = await prisma.user.findUnique({
    where: { phone: input.phone },
    select: { id: true, status: true, deletedAt: true },
  });

  // Tasdiqlangan hisob bor bo'lsa — ro'yxatdan o'tishga ruxsat bermaymiz.
  if (existing && !existing.deletedAt && existing.status !== 'PENDING_VERIFICATION') {
    throw new ConflictError("Bu raqam allaqachon ro'yxatdan o'tgan. Kirishga urinib ko'ring.");
  }

  const passwordHash = await hashPassword(input.password);

  // Tasdiqlanmagan hisob bo'lsa — ma'lumotlarini yangilaymiz (foydalanuvchi
  // kodni kiritmasdan qaytib kelgan bo'lishi mumkin).
  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName ?? null,
          deletedAt: null,
        },
        select: { id: true },
      })
    : await prisma.user.create({
        data: {
          phone: input.phone,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName ?? null,
          status: 'PENDING_VERIFICATION',
          profile: { create: {} },
        },
        select: { id: true },
      });

  const otp = await issueOtp(input.phone, OtpPurpose.PHONE_VERIFICATION);

  await recordAudit({
    actorId: user.id,
    action: AuditAction.USER_REGISTERED,
    resourceType: 'User',
    resourceId: user.id,
    module: 'auth',
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId,
  });

  return {
    phone: input.phone,
    expiresInSeconds: otp.expiresInSeconds,
    resendAfterSeconds: otp.resendAfterSeconds,
  };
}

/** Tasdiqlash kodini qayta yuboradi. */
export async function resendVerificationOtp(phone: string): Promise<RegisterResult> {
  await enforceRateLimit('otpSend', phone);

  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, status: true, deletedAt: true },
  });

  // Raqam ro'yxatda yo'qligini oshkor qilmaymiz — aks holda hujumchi
  // qaysi raqamlar tizimda borligini bilib olardi.
  if (!user || user.deletedAt || user.status !== 'PENDING_VERIFICATION') {
    logger.info({ phone: maskUzPhone(phone) }, "Tasdiqlash kodi so'raldi, lekin hisob mos emas");
    const env = serverEnv();
    return { phone, expiresInSeconds: env.OTP_TTL, resendAfterSeconds: env.OTP_RESEND_COOLDOWN };
  }

  const otp = await issueOtp(phone, OtpPurpose.PHONE_VERIFICATION);

  return { phone, expiresInSeconds: otp.expiresInSeconds, resendAfterSeconds: otp.resendAfterSeconds };
}

export interface AuthSuccessResult extends TokenPair {
  user: AuthUserPayload;
}

/**
 * Telefon raqamini tasdiqlaydi va hisobni faollashtiradi.
 *
 * Shu paytda foydalanuvchiga `CUSTOMER` roli beriladi va hamyon ochiladi.
 * Bu uchta amal bitta tranzaksiyada bajariladi — yarim holatda qolmasligi uchun.
 */
export async function verifyPhone(input: VerifyOtpInput, context: AuditContext): Promise<AuthSuccessResult> {
  await enforceRateLimit('otpVerify', input.phone);

  const user = await prisma.user.findUnique({ where: { phone: input.phone }, select: USER_SELECT });

  if (!user || user.deletedAt) {
    throw new ValidationError("Kod noto'g'ri yoki muddati tugagan");
  }

  await verifyOtp(input.phone, input.code, OtpPurpose.PHONE_VERIFICATION);

  const customerRole = await prisma.role.findUnique({ where: { name: 'CUSTOMER' }, select: { id: true } });

  if (!customerRole) {
    // Seed bajarilmagan bo'lsa shu holat yuz beradi.
    logger.error('CUSTOMER roli bazada topilmadi. "npm run db:seed" bajarilganini tekshiring.');
    throw new ValidationError("Tizim sozlamalari to'liq emas. Qo'llab-quvvatlash xizmatiga murojaat qiling.");
  }

  const activated = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE', phoneVerified: new Date() },
      select: USER_SELECT,
    });

    // `upsert` ishlatamiz — takroriy tasdiqlashda xatolik bermasin.
    await tx.userRoleAssignment.upsert({
      where: { userId_roleId: { userId: user.id, roleId: customerRole.id } },
      update: {},
      create: { userId: user.id, roleId: customerRole.id },
    });

    await tx.wallet.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    return tx.user.findUniqueOrThrow({ where: { id: updated.id }, select: USER_SELECT });
  });

  await recordAudit({
    actorId: user.id,
    action: AuditAction.USER_PHONE_VERIFIED,
    resourceType: 'User',
    resourceId: user.id,
    module: 'auth',
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId,
  });

  const authUser = toAuthUser(activated);
  const tokens = await createSession({ id: authUser.id, phone: authUser.phone, roles: authUser.roles }, context);

  return { ...tokens, user: authUser };
}

// ---------------------------------------------------------------------------
// Kirish
// ---------------------------------------------------------------------------

/** Telefon raqami va parol bilan tizimga kiritadi. */
export async function login(input: LoginInput, context: AuditContext): Promise<AuthSuccessResult> {
  await enforceRateLimit('login', input.phone);

  const user = await prisma.user.findUnique({ where: { phone: input.phone }, select: USER_SELECT });
  const passwordMatches = await verifyPassword(input.password, user?.passwordHash ?? null);

  // Foydalanuvchi topilmadimi yoki parol xatomi — bir xil xabar beramiz.
  // Aks holda hujumchi qaysi raqamlar tizimda borligini aniqlab olardi.
  if (!user || user.deletedAt || !passwordMatches) {
    await recordAudit({
      actorId: user?.id ?? null,
      action: AuditAction.USER_LOGIN_FAILED,
      resourceType: 'User',
      resourceId: user?.id ?? null,
      module: 'auth',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
      metadata: { phone: maskUzPhone(input.phone) },
    });

    throw new UnauthorizedError("Telefon raqami yoki parol noto'g'ri");
  }

  if (user.status === 'PENDING_VERIFICATION') {
    throw new UnauthorizedError('Telefon raqamingiz tasdiqlanmagan. Tasdiqlash kodini kiriting.');
  }

  if (user.status === 'SUSPENDED') {
    throw new UnauthorizedError("Hisobingiz bloklangan. Qo'llab-quvvatlash xizmatiga murojaat qiling.");
  }

  if (user.status !== 'ACTIVE') {
    throw new UnauthorizedError('Hisob faol emas');
  }

  // Muvaffaqiyatli kirdi — noto'g'ri urinishlar hisoblagichini tozalaymiz.
  await resetRateLimit('login', input.phone);

  const authUser = toAuthUser(user);
  const tokens = await createSession({ id: authUser.id, phone: authUser.phone, roles: authUser.roles }, context);

  await recordAudit({
    actorId: user.id,
    action: AuditAction.USER_LOGIN_SUCCESS,
    resourceType: 'User',
    resourceId: user.id,
    module: 'auth',
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId,
  });

  return { ...tokens, user: authUser };
}

// ---------------------------------------------------------------------------
// Parolni tiklash
// ---------------------------------------------------------------------------

export interface PasswordResetRequestResult {
  expiresInSeconds: number;
  resendAfterSeconds: number;
}

/**
 * Parolni tiklash uchun SMS kod yuboradi.
 *
 * Raqam tizimda bor-yo'qligidan qat'i nazar bir xil javob qaytaramiz —
 * bu "user enumeration" (foydalanuvchilarni sanab chiqish) hujumini to'sadi.
 */
export async function requestPasswordReset(
  phone: string,
  context: AuditContext,
): Promise<PasswordResetRequestResult> {
  await enforceRateLimit('passwordReset', phone);

  const env = serverEnv();
  const neutralResult = { expiresInSeconds: env.OTP_TTL, resendAfterSeconds: env.OTP_RESEND_COOLDOWN };

  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, status: true, deletedAt: true },
  });

  if (!user || user.deletedAt || user.status !== 'ACTIVE') {
    logger.info({ phone: maskUzPhone(phone) }, "Parolni tiklash so'raldi, lekin hisob mos emas");
    return neutralResult;
  }

  const otp = await issueOtp(phone, OtpPurpose.PASSWORD_RESET);

  await recordAudit({
    actorId: user.id,
    action: AuditAction.USER_PASSWORD_RESET_REQUESTED,
    resourceType: 'User',
    resourceId: user.id,
    module: 'auth',
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId,
  });

  return { expiresInSeconds: otp.expiresInSeconds, resendAfterSeconds: otp.resendAfterSeconds };
}

/**
 * Kodni tekshirib yangi parolni o'rnatadi.
 * Xavfsizlik uchun barcha eski sessiyalar bekor qilinadi.
 */
export async function resetPassword(input: ResetPasswordInput, context: AuditContext): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { phone: input.phone },
    select: { id: true, status: true, deletedAt: true },
  });

  if (!user || user.deletedAt || user.status !== 'ACTIVE') {
    throw new ValidationError("Kod noto'g'ri yoki muddati tugagan");
  }

  await verifyOtp(input.phone, input.code, OtpPurpose.PASSWORD_RESET);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(input.password) },
  });

  const revokedCount = await revokeAllSessions(user.id);

  await recordAudit({
    actorId: user.id,
    action: AuditAction.USER_PASSWORD_RESET_COMPLETED,
    resourceType: 'User',
    resourceId: user.id,
    module: 'auth',
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    requestId: context.requestId,
    metadata: { revokedSessions: revokedCount },
  });
}

// ---------------------------------------------------------------------------
// Joriy foydalanuvchi
// ---------------------------------------------------------------------------

/** ID bo'yicha foydalanuvchini qaytaradi (`/me` uchun). */
export async function getAuthUser(userId: string): Promise<AuthUserPayload> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });

  if (!user || user.deletedAt || user.status !== 'ACTIVE') {
    throw new UnauthorizedError('Hisob topilmadi yoki faol emas');
  }

  return toAuthUser(user);
}

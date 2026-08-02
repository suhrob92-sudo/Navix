import { ServiceUnavailableError } from '@/lib/api/errors';
import { serverEnv } from '@/lib/env';
import { logger } from '@/lib/logger';
import { getRedis } from '@/lib/redis';
import type { SmsMessage, SmsSendResult, SmsSender } from '@/lib/sms/types';

/**
 * Eskiz.uz orqali haqiqiy SMS yuboruvchi.
 *
 * Eskiz — O'zbekistonda eng ko'p ishlatiladigan SMS gateway.
 * Ishlash tartibi:
 *  1. Email + parol bilan `/auth/login` ga murojaat qilinadi va token olinadi;
 *  2. Token 30 kun amal qiladi — uni Redis'da keshlaymiz (har SMS uchun
 *     qayta login qilish sekin va keraksiz);
 *  3. `/message/sms/send` ga token bilan xabar yuboriladi;
 *  4. Token eskirgan bo'lsa (401) — bir marta qayta login qilib, qayta urinamiz.
 */

/** Eskiz token'i Redis'da shu kalit ostida saqlanadi. */
const TOKEN_CACHE_KEY = 'navix:sms:eskiz:token';
/** Token'ni 25 kun keshlaymiz (Eskiz 30 kun beradi — zaxira vaqt qoldiramiz). */
const TOKEN_CACHE_TTL_SECONDS = 60 * 60 * 24 * 25;
/** Tarmoq so'rovi uchun maksimal kutish vaqti. */
const REQUEST_TIMEOUT_MS = 10_000;

interface EskizLoginResponse {
  data?: { token?: string };
  message?: string;
}

interface EskizSendResponse {
  id?: string | number;
  status?: string;
  message?: string;
}

export class EskizSmsSender implements SmsSender {
  public readonly name = 'eskiz';

  /** Eskiz API'ga so'rov yuboradi va kechikish bo'lsa uzib qo'yadi. */
  private async request(path: string, init: RequestInit): Promise<Response> {
    const { ESKIZ_BASE_URL } = serverEnv();

    try {
      return await fetch(`${ESKIZ_BASE_URL}${path}`, {
        ...init,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      logger.error({ err: error, path }, "Eskiz API bilan bog'lanib bo'lmadi");
      throw new ServiceUnavailableError('SMS xizmati vaqtincha ishlamayapti');
    }
  }

  /** Eskiz'dan yangi token oladi va keshga yozadi. */
  private async login(): Promise<string> {
    const env = serverEnv();

    const body = new FormData();
    body.append('email', env.ESKIZ_EMAIL ?? '');
    body.append('password', env.ESKIZ_SECRET ?? '');

    const response = await this.request('/auth/login', { method: 'POST', body });

    if (!response.ok) {
      logger.error({ status: response.status }, 'Eskiz login muvaffaqiyatsiz');
      throw new ServiceUnavailableError("SMS xizmatiga ulanib bo'lmadi");
    }

    const payload = (await response.json()) as EskizLoginResponse;
    const token = payload.data?.token;

    if (!token) {
      logger.error({ payload }, 'Eskiz javobida token topilmadi');
      throw new ServiceUnavailableError("SMS xizmatiga ulanib bo'lmadi");
    }

    try {
      await getRedis().set(TOKEN_CACHE_KEY, token, 'EX', TOKEN_CACHE_TTL_SECONDS);
    } catch (error) {
      // Kesh ishlamasa ham SMS yuborish davom etadi — faqat sekinroq bo'ladi.
      logger.warn({ err: error }, "Eskiz token'ini keshga yozib bo'lmadi");
    }

    return token;
  }

  /** Keshdagi token'ni qaytaradi; bo'lmasa yangisini oladi. */
  private async getToken(forceRefresh = false): Promise<string> {
    if (!forceRefresh) {
      try {
        const cached = await getRedis().get(TOKEN_CACHE_KEY);
        if (cached) return cached;
      } catch (error) {
        logger.warn({ err: error }, "Eskiz token'ini keshdan o'qib bo'lmadi");
      }
    }

    return this.login();
  }

  /** Bitta yuborish urinishi. 401 qaytsa `null` beradi — chaqiruvchi qayta urinadi. */
  private async trySend(message: SmsMessage, token: string): Promise<SmsSendResult | null> {
    const env = serverEnv();

    const body = new FormData();
    // Eskiz raqamni "+" belgisiz kutadi: 998901234567
    body.append('mobile_phone', message.to.replace(/\D/g, ''));
    body.append('message', message.text);
    body.append('from', env.ESKIZ_SENDER);

    const response = await this.request('/message/sms/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    });

    if (response.status === 401) {
      return null;
    }

    const payload = (await response.json().catch(() => ({}))) as EskizSendResponse;

    if (!response.ok) {
      logger.error({ status: response.status, payload }, 'Eskiz SMS yubormadi');
      throw new ServiceUnavailableError("SMS yuborib bo'lmadi. Keyinroq urinib ko'ring.");
    }

    return { messageId: String(payload.id ?? ''), provider: this.name };
  }

  async send(message: SmsMessage): Promise<SmsSendResult> {
    const result = await this.trySend(message, await this.getToken());

    if (result) {
      return result;
    }

    // Token eskirgan — yangilab, bir marta qayta urinamiz.
    logger.info("Eskiz token'i eskirgan, yangilanmoqda");
    const retried = await this.trySend(message, await this.getToken(true));

    if (!retried) {
      throw new ServiceUnavailableError('SMS xizmatida avtorizatsiya xatosi');
    }

    return retried;
  }
}

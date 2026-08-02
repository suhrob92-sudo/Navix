import { serverEnv } from '@/lib/env';
import { ConsoleSmsSender } from '@/lib/sms/console-sender';
import { EskizSmsSender } from '@/lib/sms/eskiz-sender';
import type { SmsSender } from '@/lib/sms/types';

export type { SmsMessage, SmsSendResult, SmsSender } from '@/lib/sms/types';

/**
 * `.env` dagi `SMS_PROVIDER` qiymatiga qarab kerakli yuboruvchini qaytaradi.
 * Nusxa bir marta yaratiladi va qayta ishlatiladi.
 */

let cachedSender: SmsSender | null = null;

export function getSmsSender(): SmsSender {
  if (cachedSender) {
    return cachedSender;
  }

  cachedSender = serverEnv().SMS_PROVIDER === 'eskiz' ? new EskizSmsSender() : new ConsoleSmsSender();
  return cachedSender;
}

/** Testlarda soxta (mock) yuboruvchini o'rnatish uchun. */
export function setSmsSender(sender: SmsSender | null): void {
  cachedSender = sender;
}

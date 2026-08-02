import { randomUUID } from 'node:crypto';

import { logger } from '@/lib/logger';
import type { SmsMessage, SmsSendResult, SmsSender } from '@/lib/sms/types';

/**
 * Ishlab chiqish uchun SMS "yuboruvchi".
 *
 * Haqiqiy SMS yubormaydi — xabarni terminalga chiqaradi. Shu sababli
 * SMS xizmatiga pul to'lamasdan butun ro'yxatdan o'tish jarayonini
 * sinab ko'rish mumkin.
 *
 * DIQQAT: production'da ishlatilmasligi kerak. `SMS_PROVIDER=eskiz` qo'ying.
 */
export class ConsoleSmsSender implements SmsSender {
  public readonly name = 'console';

  async send(message: SmsMessage): Promise<SmsSendResult> {
    const messageId = randomUUID();

    // Terminalda ko'zga tashlanishi uchun ramka bilan chiqaramiz.
    logger.info(
      { to: message.to, messageId },
      `\n┌───────────────── SMS (ishlab chiqish rejimi) ─────────────────\n│ Kimga: ${message.to}\n│ Matn:  ${message.text}\n└───────────────────────────────────────────────────────────────`,
    );

    return { messageId, provider: this.name };
  }
}

/**
 * SMS yuborish uchun umumiy shartnoma (interface).
 *
 * Nima uchun interface: bugun Eskiz.uz, ertaga Playmobile yoki boshqa
 * provayder ishlatilishi mumkin. Biznes kod faqat shu interface'ni biladi,
 * shuning uchun provayderni almashtirish uchun ilovaning qolgan qismiga
 * tegish shart emas (Dependency Inversion prinsipi).
 */

export interface SmsMessage {
  /** E.164 formatdagi qabul qiluvchi raqami: +998901234567 */
  to: string;
  /** Xabar matni. */
  text: string;
}

export interface SmsSendResult {
  /** Provayder tomonidan berilgan xabar ID'si (kuzatish uchun). */
  messageId: string;
  /** Qaysi provayder yubordi. */
  provider: string;
}

export interface SmsSender {
  readonly name: string;
  send(message: SmsMessage): Promise<SmsSendResult>;
}

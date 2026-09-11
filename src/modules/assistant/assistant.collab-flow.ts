import { listCollabOffers } from '@/modules/collab/collab.service';
import type { AssistantReply } from '@/modules/assistant/assistant.types';

/**
 * "Navix, ijodkor top" — yordamchining hamkorlik oqimi.
 *
 * ── Nima uchun bu modulga yordamchi KERAK ─────────────────────────────
 * Hamkorlik faqat LENTA ichidagi menyu orqali ochiladi. Modullar
 * reyestrida u yo'q, ya'ni qidiruvda ham chiqmaydi. Undan xabari
 * bo'lmagan odam bo'limni hech qachon topmaydi.
 *
 * Aynan shunday bo'limlar uchun yordamchi eng foydali: odam nima
 * xohlashini biladi ("reklama beraman"), lekin u ilovada qayerda
 * turishini bilmaydi.
 *
 * ── Nima uchun taklif YUBORILMAYDI ────────────────────────────────────
 * Taklifda sarlavha va batafsil shartlar bo'ladi: nima kerak,
 * qancha, qachon. Ularni suhbatda yozdirish uzun bo'lardi, ustiga
 * odam KIMGA yuborayotganini ko'rishi kerak — ijodkorning profili,
 * obunachilari, ishlari.
 *
 * Shuning uchun yordamchi ro'yxatni ochadi, tanlashni odam qiladi.
 */

/** Ijodkorlar ro'yxatini ochadi. */
export function handleFindCreator(): AssistantReply {
  return {
    text:
      "Hamkorlikka ochiq ijodkorlar ro'yxatini ochaman. Kerakligini tanlab, " +
      'taklif yuborishingiz mumkin — nima kerakligi va shartlarni yozasiz.',
    suggestions: ['Takliflarim', 'Balansim qancha'],
    action: { kind: 'navigate', href: '/feed/creators', label: 'Ijodkorlar' },
    state: { slots: {} },
  };
}

/**
 * Kelgan takliflar.
 *
 * ── Nima uchun SONI aytiladi ──────────────────────────────────────────
 * "Takliflaringizni ochaman" degan javob hech narsa qo'shmaydi —
 * odam buni tugmani bosib ham bilardi. Javob kutayotgan takliflar
 * SONI esa savolning o'zi: "menga taklif keldimi?".
 */
export async function handleCollabOffers(userId: string): Promise<AssistantReply> {
  const { pendingCount } = await listCollabOffers(userId, { box: 'IN', limit: 1 });

  const text =
    pendingCount > 0
      ? `${pendingCount} ta hamkorlik taklifi javob kutmoqda.`
      : "Javob kutayotgan hamkorlik taklifi yo'q.";

  return {
    text,
    /*
      Taklif bo'lmasa, keyingi qadam boshqa: o'zi ijodkor
      qidirishi mumkin.
    */
    suggestions: pendingCount > 0 ? ['Ijodkor top'] : ['Ijodkor top', 'Balansim qancha'],
    action: { kind: 'navigate', href: '/feed/collab', label: 'Takliflarni ochish' },
    state: { slots: {} },
  };
}

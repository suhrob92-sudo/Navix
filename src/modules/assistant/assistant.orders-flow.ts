import { listOrders } from '@/modules/orders/orders.service';
import { ORDER_KIND_META } from '@/modules/orders/orders.types';
import type { AssistantReply } from '@/modules/assistant/assistant.types';

/**
 * "Navix, buyurtmalarim" — barcha buyurtmalar tarixi.
 *
 * ── Nima uchun FAOL buyurtmalar aytiladi ──────────────────────────────
 * "Buyurtmalaringizni ochaman" degan javob hech narsa qo'shmaydi —
 * odam buni tugmani bosib ham bilardi.
 *
 * Odam "buyurtmalarim" deb so'raganda ko'pincha bitta narsani
 * bilmoqchi: hozir nimadir kutilyaptimi? Shuning uchun javobda
 * FAOL buyurtmalar turadi, yakunlanganlar esa ekranda.
 */

export async function handleMyOrders(userId: string): Promise<AssistantReply> {
  const active = await listOrders(userId, { page: 1, filter: 'ACTIVE', kind: 'ALL' });

  if (active.total === 0) {
    /*
      Yakunlanganlar BOR yoki YO'Qligini ajratamiz.

      "Buyurtma yo'q" deyish — hech qachon buyurtma qilmagan odam
      uchun to'g'ri, lekin o'ntasini qilib bo'lgan odam uchun
      YOLG'ON: uning tarixi bor, shunchaki faoli yo'q.
    */
    const all = await listOrders(userId, { page: 1, filter: 'ALL', kind: 'ALL' });

    return {
      text:
        all.total === 0
          ? 'Hali buyurtma qilmagansiz.'
          : `Faol buyurtma yo'q. Jami ${all.total} ta buyurtma tarixda.`,
      suggestions: ['Ovqat buyur', 'Balansim qancha'],
      action: { kind: 'navigate', href: '/orders', label: 'Buyurtmalarim' },
      state: { slots: {} },
    };
  }

  /*
    Turlar bo'yicha sanab beriladi: "1 ta ovqat, 1 ta posilka".

    Faqat umumiy son ("2 ta buyurtma") kamroq foyda berardi —
    odam qaysi biri ekanini baribir ochib ko'rardi.
  */
  const parts = Object.entries(active.counts)
    .filter(([, count]) => count > 0)
    .map(
      ([kind, count]) =>
        `${count} ta ${ORDER_KIND_META[kind as keyof typeof ORDER_KIND_META].label.toLowerCase()}`,
    );

  return {
    text: `${active.total} ta faol buyurtmangiz bor: ${parts.join(', ')}.`,
    suggestions: ['Buyurtmam qayerda', 'Balansim qancha'],
    action: { kind: 'navigate', href: '/orders', label: 'Buyurtmalarim' },
    state: { slots: {} },
  };
}

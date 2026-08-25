import { FOOD_ORDER_FLOW, FOOD_ORDER_STATUS_LABELS, type FoodOrderStatusName } from '@/modules/food/food.types';

/**
 * Ovqat buyurtmasining yo'li — bosqichlar va ularning VAQTI.
 *
 * ── Nima uchun bu bosqich kerak bo'ldi ────────────────────────────────
 * Buyurtma sahifasida bosqichlar ro'yxati bor edi, lekin u faqat
 * "qaysi bosqichdamiz" deb aytardi. QACHON bo'lgani ko'rinmasdi.
 *
 * Odam esa aynan shuni hisoblaydi: "yigirma daqiqadan beri
 * tayyorlanmoqda" degan yozuv "Tayyorlanmoqda" degan yozuvdan
 * butunlay boshqacha ma'lumot beradi. Birinchisi kutishning qancha
 * qolganini taxmin qilishga imkon beradi, ikkinchisi esa yo'q.
 *
 * ── Nima uchun `order-timeline.ts` dan alohida ────────────────────────
 * Marketplace uchun yozilgan chiziq KUNLAR bilan ishlaydi ("3 kun
 * oldin yo'lga chiqdi") va u yerda voqealar alohida jadvalda turadi,
 * chunki har bosqichni KIM qilgani muhim.
 *
 * Ovqatda esa ikkalasi ham boshqacha: vaqt DAQIQALARDA o'lchanadi va
 * har bosqichni kim qilgani oldindan ma'lum (oshxona, keyin kuryer).
 * Ikkalasini bitta funksiyaga tiqish har ikkisini ham murakkab
 * qilardi.
 */

/** Chiziqdagi bitta qadam. */
export interface FoodTimelineStep {
  status: FoodOrderStatusName;
  label: string;
  /** Bosqich qachon boshlangan — ISO. Noma'lum bo'lsa `null`. */
  at: string | null;
  /** Bosqich o'tilganmi. */
  isDone: boolean;
  /** Hozir shu bosqichdami. */
  isCurrent: boolean;
}

/** Chiziq yasash uchun kerakli vaqtlar. */
export interface FoodOrderTimes {
  status: FoodOrderStatusName;
  createdAt: string;
  confirmedAt: string | null;
  preparingAt: string | null;
  deliveringAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

/**
 * Buyurtma vaqtlaridan kuzatuv chizig'ini yasaydi.
 *
 * ── Nima uchun bo'sh vaqt O'YLAB TOPILMAYDI ───────────────────────────
 * `preparingAt` va `deliveringAt` ustunlari 48-bosqichda qo'shildi.
 * Undan oldingi buyurtmalarda ular bo'sh va uni to'ldirishning
 * halol yo'li yo'q.
 *
 * "Taxminan shu vaqtda bo'lgandir" deb yozish mumkin edi va ekran
 * chiroyliroq ko'rinardi. Lekin o'shanda ekrandagi son bilan
 * haqiqat orasidagi farqni HECH KIM sezmasdi — bu esa eng yomon
 * turdagi xato.
 *
 * Shuning uchun bosqich ko'rsatiladi, vaqti esa shunchaki bo'sh
 * qoladi.
 */
export function buildFoodTimeline(order: FoodOrderTimes): FoodTimelineStep[] {
  const times: Record<FoodOrderStatusName, string | null> = {
    PENDING: order.createdAt,
    CONFIRMED: order.confirmedAt,
    PREPARING: order.preparingAt,
    DELIVERING: order.deliveringAt,
    DELIVERED: order.deliveredAt,
    CANCELLED: order.cancelledAt,
  };

  /*
    ── Bekor qilingan buyurtma ────────────────────────────────────────
    Uning yo'li boshqacha tugaydi: bosib o'tilgan bosqichlar qoladi,
    qolganlari esa KO'RSATILMAYDI.

    Aks holda "Yetkazildi" degan kulrang qator turardi va u hech
    qachon yonmaydigan va'daga o'xshardi.
  */
  if (order.status === 'CANCELLED') {
    const passed = FOOD_ORDER_FLOW.filter((status) => times[status] !== null).map((status) =>
      toStep(status, times[status], true, false),
    );

    return [...passed, toStep('CANCELLED', times.CANCELLED, true, true)];
  }

  const currentIndex = FOOD_ORDER_FLOW.indexOf(order.status);

  return FOOD_ORDER_FLOW.map((status, index) =>
    toStep(
      status,
      times[status],
      /*
        Bosqich "o'tilgan" deb hisoblanadi, agar u hozirgi holatgacha
        (u bilan birga) bo'lsa.

        ── Nima uchun VAQT BORLIGIGA qarab emas ───────────────────────
        Eski buyurtmalarda `preparingAt` bo'sh. Faqat vaqtga qarasak,
        yetkazilgan buyurtmada ham "Tayyorlanmoqda" bosqichi
        o'tilmagandek ko'rinardi.
      */
      currentIndex >= 0 && index <= currentIndex,
      index === currentIndex,
    ),
  );
}

function toStep(
  status: FoodOrderStatusName,
  at: string | null,
  isDone: boolean,
  isCurrent: boolean,
): FoodTimelineStep {
  return { status, label: FOOD_ORDER_STATUS_LABELS[status], at, isDone, isCurrent };
}

/**
 * Hozirgi bosqich qancha vaqtdan beri davom etayotgani.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * "Tayyorlanmoqda" degan yozuv o'zgarmay tursa, odam ilova qotib
 * qolgan deb o'ylaydi. Yonidagi "12 daqiqadan beri" esa jarayon
 * ketayotganini ko'rsatadi.
 *
 * @returns Daqiqada. Vaqt noma'lum bo'lsa `null`.
 */
export function minutesInStep(steps: readonly FoodTimelineStep[], now: Date = new Date()): number | null {
  const current = steps.find((step) => step.isCurrent);

  if (!current?.at) return null;

  const started = new Date(current.at).getTime();

  if (Number.isNaN(started)) return null;

  return Math.max(0, Math.floor((now.getTime() - started) / 60_000));
}

/**
 * "Qancha vaqtdan beri" matni.
 *
 * Bir daqiqadan kam vaqt uchun son ko'rsatilmaydi: "0 daqiqadan beri"
 * degan yozuv g'alati va u sekundlar sanashga undaydi.
 */
export function stepDurationText(minutes: number | null): string | null {
  if (minutes === null || minutes < 1) return null;

  if (minutes < 60) return `${minutes} daqiqadan beri`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${hours} soatdan beri` : `${hours} soat ${rest} daqiqadan beri`;
}

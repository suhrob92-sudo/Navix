import {
  MARKET_ORDER_FLOW,
  MARKET_ORDER_STATUS_LABELS,
  type MarketOrderStatusName,
} from '@/modules/market/market.types';

/**
 * Buyurtma yo'li — yagona sozlama.
 *
 * ── Nima uchun bu bosqich kerak bo'ldi ────────────────────────────────
 * Buyurtma sahifasida bosqichlar ro'yxati bor edi, lekin u faqat
 * "qaysi bosqichdamiz" deb aytardi. QACHON bo'lgani ko'rinmasdi.
 *
 * Ovqat 40 daqiqada keladi — u yerda vaqt muhim emas. Mahsulot esa
 * kunlab yo'lda bo'ladi va xaridorning asosiy savoli aynan vaqt
 * haqida: "uch kun oldin yo'lga chiqqan edi, hali ham kelmadi".
 *
 * Sanasiz chiziq bu savolga javob bermasdi va odam qo'llab-quvvatlash
 * xizmatiga yozardi.
 *
 * ── Nima uchun kelajakdagi bosqichlar ham ko'rsatiladi ────────────────
 * Faqat bo'lib o'tgan voqealarni ko'rsatish ham mumkin edi va kod
 * soddaroq bo'lardi.
 *
 * Lekin o'shanda xaridor "yana nima bo'ladi va nechta bosqich
 * qoldi" degan savolga javob topa olmasdi. Kutish esa oxiri
 * ko'rinmaganda ancha uzoq tuyuladi.
 */

/** Bazadan kelgan bitta voqea. */
export interface OrderEventView {
  status: MarketOrderStatusName;
  /** ISO sana. */
  at: string;
  note: string | null;
  /** Kim qildi — "Sotuvchi", "Kuryer", "Siz". */
  actor: string | null;
}

/** Chiziqdagi bitta qadam. */
export interface TimelineStep {
  status: MarketOrderStatusName;
  label: string;
  /** Bo'lib o'tgan bo'lsa — ISO sana, aks holda `null`. */
  at: string | null;
  note: string | null;
  actor: string | null;
  /** Bosqich o'tilganmi. */
  isDone: boolean;
  /** Hozir shu bosqichdami. */
  isCurrent: boolean;
}

/**
 * Voqealardan kuzatuv chizig'ini yasaydi.
 *
 * ── Nima uchun voqealar ustunlardan USTUN turadi ──────────────────────
 * Bir xil bosqich ikki marta yozilgan bo'lishi mumkin (masalan
 * sotuvchi xato bosib, qaytargan bo'lsa). Bunday holatda BIRINCHI
 * yozuv olinadi: xaridor uchun "qachon birinchi marta bo'lgani"
 * muhim.
 *
 * @param events Bazadagi yozuvlar — tartibi ahamiyatsiz.
 * @param currentStatus Buyurtmaning HOZIRGI holati.
 */
export function buildTimeline(
  events: readonly OrderEventView[],
  currentStatus: MarketOrderStatusName,
): TimelineStep[] {
  /*
    Har bir bosqich uchun ENG ERTA yozuv olinadi.
  */
  const firstByStatus = new Map<MarketOrderStatusName, OrderEventView>();

  for (const event of events) {
    const existing = firstByStatus.get(event.status);

    if (!existing || event.at < existing.at) {
      firstByStatus.set(event.status, event);
    }
  }

  /*
    ── Bekor qilingan buyurtma ────────────────────────────────────────
    Uning yo'li boshqacha tugaydi: bosib o'tilgan bosqichlar qoladi,
    qolganlari esa KO'RSATILMAYDI.

    Aks holda "Yetkazildi" degan kulrang qator turardi va u hech
    qachon yonmaydigan va'daga o'xshardi.
  */
  if (currentStatus === 'CANCELLED') {
    const passed = MARKET_ORDER_FLOW.filter((status) => firstByStatus.has(status)).map((status) =>
      toStep(status, firstByStatus.get(status) ?? null, true, false),
    );

    return [...passed, toStep('CANCELLED', firstByStatus.get('CANCELLED') ?? null, true, true)];
  }

  const currentIndex = MARKET_ORDER_FLOW.indexOf(currentStatus);

  return MARKET_ORDER_FLOW.map((status, index) =>
    toStep(
      status,
      firstByStatus.get(status) ?? null,
      /*
        Bosqich "o'tilgan" deb hisoblanadi, agar u hozirgi holatgacha
        (u bilan birga) bo'lsa.

        ── Nima uchun YOZUV BORLIGIGA qarab emas ──────────────────────
        `PACKING` bosqichiga hech qachon ustun bo'lmagan va eski
        buyurtmalarda uning yozuvi yo'q. Faqat yozuvga qarasak,
        yetkazilgan buyurtmada ham "Yig'ilmoqda" bosqichi
        o'tilmagandek ko'rinardi.
      */
      currentIndex >= 0 && index <= currentIndex,
      index === currentIndex,
    ),
  );
}

function toStep(
  status: MarketOrderStatusName,
  event: OrderEventView | null,
  isDone: boolean,
  isCurrent: boolean,
): TimelineStep {
  return {
    status,
    label: MARKET_ORDER_STATUS_LABELS[status],
    at: event?.at ?? null,
    note: event?.note ?? null,
    /*
      ── HAQIQIY XATO: birinchi bosqichda XARIDOR nomi turardi ────────
      Birinchi yozuvni har doim xaridorning o'zi yaratadi — buyurtma
      bergan odam u.

      Lekin bosqichning nomi "Qabul qilinmoqda", ya'ni DO'KON qabul
      qilishini bildiradi. Yonida xaridorning ismi turgach, chiziq
      "buyurtmani Ish qabul qilmoqda" degandek o'qilardi — aslida
      Ish buyurtma bergan odam edi.

      Ekranda ko'rilganda aniqlandi. Birinchi bosqichda ism
      ko'rsatilmaydi: u hech qanday ma'lumot bermaydi, chunki u
      har doim bir xil.
    */
    actor: status === 'PENDING' ? null : (event?.actor ?? null),
    isDone,
    isCurrent,
  };
}

/**
 * Ikki sana orasida necha kun o'tgan.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * "3 kundan beri yo'lda" degan yozuv xaridorga sanani solishtirishdan
 * ko'ra ko'proq narsa aytadi.
 */
export function daysSince(iso: string, now: Date = new Date()): number {
  const then = new Date(iso).getTime();

  if (Number.isNaN(then)) return 0;

  return Math.max(0, Math.floor((now.getTime() - then) / 86_400_000));
}

/**
 * "Qancha vaqt oldin" matni.
 *
 * Bugungi voqea uchun sana ortiqcha: "bugun" aniqroq va qisqaroq.
 */
export function sinceText(iso: string, now: Date = new Date()): string {
  const days = daysSince(iso, now);

  if (days === 0) return 'bugun';
  if (days === 1) return 'kecha';

  return `${days} kun oldin`;
}

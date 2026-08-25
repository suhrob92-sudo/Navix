import { APPLICATION_STATUS_LABELS, type ApplicationStatusName } from '@/modules/job/job.types';

/**
 * Ariza yo'li — bosqichlar va ularning VAQTI.
 *
 * ── Nima uchun bu bosqich kerak bo'ldi ────────────────────────────────
 * Ariza sahifasida faqat holat YORLIG'I turardi: "Yuborildi",
 * "Ko'rildi". Nomzod uchun bu yetarli emas.
 *
 * Ish qidirish — kutish bilan o'tadigan jarayon. Nomzodning asosiy
 * savoli "qachon yuborgandim?" va "ko'rishdimi?". Ular javobsiz
 * qolsa, u har kuni arizani qayta ochib qaraydi va oxiri kompaniyaga
 * qo'ng'iroq qiladi.
 *
 * ── Nima uchun JIM QOLISH ham holat ───────────────────────────────────
 * Eng og'ir holat — javob umuman kelmasligi. Ko'p platformalar buni
 * yashiradi va ariza abadiy "Yuborildi" bo'lib qoladi.
 *
 * Bu yerda esa kutish MUDDATI aytiladi: "12 kundan beri javob yo'q".
 * Bu nomzodga qaror qabul qilishga yordam beradi — u boshqa joyga
 * ariza yuboradi.
 */

/** Chiziqdagi bitta qadam. */
export interface ApplicationStep {
  status: ApplicationStatusName;
  label: string;
  /** Bosqich qachon bo'lgan — ISO. Noma'lum bo'lsa `null`. */
  at: string | null;
  isDone: boolean;
  isCurrent: boolean;
}

/** Chiziq yasash uchun kerakli ma'lumot. */
export interface ApplicationTimes {
  status: ApplicationStatusName;
  createdAt: string;
  viewedAt: string | null;
  decidedAt: string | null;
}

/**
 * Arizaning ODATDAGI yo'li.
 *
 * `WITHDRAWN` bu yerda YO'Q: u nomzodning o'z qarori va yo'lning
 * bir qismi emas — u yo'ldan chiqish.
 */
const APPLICATION_FLOW: readonly ApplicationStatusName[] = ['SENT', 'VIEWED', 'INVITED'];

/**
 * Ariza vaqtlaridan kuzatuv chizig'ini yasaydi.
 *
 * ── Nima uchun RAD ETISH alohida ishlanadi ────────────────────────────
 * "Taklif qilindi" bosqichi rad etilgan arizada hech qachon
 * bo'lmaydi. Uni kulrang qator qilib qoldirish "hali bo'lishi
 * mumkin" degan yolg'on umid berardi.
 */
export function buildApplicationTimeline(application: ApplicationTimes): ApplicationStep[] {
  const times: Record<ApplicationStatusName, string | null> = {
    SENT: application.createdAt,
    VIEWED: application.viewedAt,
    INVITED: application.decidedAt,
    REJECTED: application.decidedAt,
    WITHDRAWN: application.decidedAt,
  };

  const step = (
    status: ApplicationStatusName,
    isDone: boolean,
    isCurrent: boolean,
  ): ApplicationStep => ({
    status,
    label: APPLICATION_STATUS_LABELS[status],
    at: times[status],
    isDone,
    isCurrent,
  });

  /*
    ── Yo'ldan chiqish: rad etildi yoki qaytarib olindi ───────────────
    Ikkalasida ham bosib o'tilgan bosqichlar qoladi, kelajakdagilari
    esa KO'RSATILMAYDI.
  */
  if (application.status === 'REJECTED' || application.status === 'WITHDRAWN') {
    const passed = APPLICATION_FLOW.filter(
      (status) => status !== 'INVITED' && times[status] !== null,
    ).map((status) => step(status, true, false));

    return [...passed, step(application.status, true, true)];
  }

  const currentIndex = APPLICATION_FLOW.indexOf(application.status);

  return APPLICATION_FLOW.map((status, index) =>
    step(
      status,
      /*
        Bosqich "o'tilgan" deb hisoblanadi, agar u hozirgi holatgacha
        (u bilan birga) bo'lsa.

        VAQT BORLIGIGA qarab emas: ish beruvchi arizani ochmasdan
        turib ham taklif qilishi mumkin va o'shanda `viewedAt`
        bo'sh qoladi.
      */
      currentIndex >= 0 && index <= currentIndex,
      index === currentIndex,
    ),
  );
}

/**
 * Javob kutilayotgan KUNLAR soni.
 *
 * @returns Javob allaqachon kelgan bo'lsa `null`.
 */
export function waitingDays(application: ApplicationTimes, now: Date = new Date()): number | null {
  if (application.status !== 'SENT' && application.status !== 'VIEWED') return null;

  /*
    Hisob OXIRGI voqeadan boshlanadi: ish beruvchi arizani ko'rgan
    bo'lsa, kutish o'sha kundan sanaladi. Aks holda "20 kundan beri
    javob yo'q" degan yozuv ish beruvchi kecha ko'rgan arizada ham
    turardi.
  */
  const since = application.viewedAt ?? application.createdAt;
  const started = new Date(since).getTime();

  if (Number.isNaN(started)) return null;

  return Math.max(0, Math.floor((now.getTime() - started) / 86_400_000));
}

/**
 * Kutish holatini odam tiliga o'giradi.
 *
 * ── Nima uchun bugungi ariza uchun matn YO'Q ──────────────────────────
 * "0 kundan beri javob yo'q" degan yozuv arizani endigina yuborgan
 * odamni bekorga xavotirga solardi.
 */
export function waitingText(application: ApplicationTimes, now: Date = new Date()): string | null {
  const days = waitingDays(application, now);

  if (days === null || days < 1) return null;

  const prefix = application.status === 'VIEWED' ? "Ko'rilganiga" : 'Yuborilganiga';

  return days === 1 ? `${prefix} 1 kun bo'ldi` : `${prefix} ${days} kun bo'ldi`;
}

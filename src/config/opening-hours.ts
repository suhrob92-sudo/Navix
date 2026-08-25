/**
 * Restoranning ish vaqti — yagona sozlama.
 *
 * ── Nima uchun bu bosqich kerak bo'ldi ────────────────────────────────
 * Restoranda faqat `isOpen` bayrog'i bor edi va uni ega qo'lda
 * bosardi. Amalda buni hech kim qilmaydi: hech bir oshpaz har kuni
 * ertalab "ochdim", kechqurun "yopdim" deb bosib o'tirmaydi.
 *
 * Natijada kechasi soat uchda ham restoran "ochiq" ko'rinardi. Odam
 * buyurtma berardi, pul yechilardi va u javob kutib qolardi.
 *
 * ── Nima uchun bayroq BARIBIR qoladi ──────────────────────────────────
 * Jadval "odatda qachon ishlaymiz" degan savolga javob beradi.
 * Bayroq esa "bugun favqulodda yopiqmiz" — ta'mir, to'y, gaz yo'q.
 *
 * Restoran ochiq hisoblanadi FAQAT ikkalasi ham rozi bo'lganda.
 *
 * ── Nima uchun vaqt DAQIQADA ──────────────────────────────────────────
 * Kun boshidan hisoblangan daqiqa (09:30 → 570) oddiy son: uni
 * solishtirish ham, qo'shish ham xatosiz ishlaydi va vaqt mintaqasi
 * aralashmaydi.
 */

/** O'zbekistonning UTC dan farqi, daqiqada. Yozgi vaqtga o'tilmaydi. */
const TASHKENT_OFFSET_MINUTES = 5 * 60;

const MINUTES_IN_DAY = 24 * 60;

/** Bitta kunning ish vaqti. */
export interface DayHours {
  /** 0 — yakshanba, 6 — shanba (JavaScript tartibi). */
  weekday: number;
  /** Kun boshidan daqiqada. */
  opensAt: number;
  closesAt: number;
}

/**
 * Hafta kunlarining nomlari.
 *
 * Tartib JavaScript'niki: 0 — yakshanba. Ekranda esa hafta
 * DUSHANBADAN boshlanadi — sabab `WEEK_ORDER` da.
 */
export const WEEKDAY_LABELS: readonly string[] = [
  'Yakshanba',
  'Dushanba',
  'Seshanba',
  'Chorshanba',
  'Payshanba',
  'Juma',
  'Shanba',
];

export const WEEKDAY_SHORT: readonly string[] = ['Yak', 'Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sha'];

/**
 * Ekranda ko'rsatish tartibi — DUSHANBADAN.
 *
 * ── Nima uchun JavaScript tartibi emas ────────────────────────────────
 * `Date.getDay()` yakshanbani birinchi deb hisoblaydi. O'zbekistonda
 * esa hafta dushanbadan boshlanadi va jadval yakshanbadan boshlansa,
 * odam uni noto'g'ri o'qirdi.
 */
export const WEEK_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0];

/**
 * Toshkent vaqti bo'yicha hafta kuni va daqiqa.
 *
 * ── Nima uchun qurilma vaqti ISHLATILMAYDI ────────────────────────────
 * Chet elda turgan odamning telefoni boshqa vaqtni ko'rsatadi va
 * restoran unga "yopiq" bo'lib ko'rinardi — aslida Toshkentda tush
 * payti edi.
 */
export function tashkentNow(now: Date = new Date()): { weekday: number; minutes: number } {
  const shifted = new Date(now.getTime() + TASHKENT_OFFSET_MINUTES * 60_000);

  return {
    weekday: shifted.getUTCDay(),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

/** Daqiqani soatga o'giradi: 570 → "09:30". */
export function formatMinutes(value: number): string {
  const normalized = ((value % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;

  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Ish vaqti YARIM TUNDAN oshadimi.
 *
 * ── Nima uchun bu holat alohida ───────────────────────────────────────
 * "10:00 dan 02:00 gacha" restoranlar uchun odatiy holat. Oddiy
 * solishtirish (`opensAt <= hozir < closesAt`) bunday jadvalda HECH
 * QACHON rost bo'lmasdi va tungi kafe doim "yopiq" ko'rinardi.
 */
export function isOvernight(day: DayHours): boolean {
  return day.closesAt <= day.opensAt;
}

/**
 * Restoran SHU PAYTDA ochiqmi — faqat jadval bo'yicha.
 *
 * `isOpen` bayrog'i bu yerda tekshirilmaydi: u alohida qaror va uni
 * chaqiruvchi qo'shadi (`isRestaurantOpen`).
 */
export function isOpenAt(
  hours: readonly DayHours[],
  now: Date = new Date(),
): boolean {
  const { weekday, minutes } = tashkentNow(now);

  const today = hours.find((day) => day.weekday === weekday);

  if (today) {
    if (isOvernight(today)) {
      // Kechqurun ochilgan va hali yopilmagan.
      if (minutes >= today.opensAt) return true;
    } else if (minutes >= today.opensAt && minutes < today.closesAt) {
      return true;
    }
  }

  /*
    ── KECHAGI kun tekshiriladi ──────────────────────────────────────
    Soat 01:00 da restoran ochiq bo'lishi mumkin, chunki u KECHA
    22:00 da ochilib, bugun 03:00 da yopiladi.

    Bu holat unutilsa, tungi kafe har kuni yarim tunda "yopilib"
    qolardi.
  */
  const yesterday = hours.find((day) => day.weekday === (weekday + 6) % 7);

  if (yesterday && isOvernight(yesterday) && minutes < yesterday.closesAt) {
    return true;
  }

  return false;
}

/**
 * Restoran buyurtma qabul qilyaptimi.
 *
 * Ikkala shart ham bajarilishi kerak — sabab modul izohida.
 */
export function isRestaurantOpen(
  hours: readonly DayHours[],
  isOpenFlag: boolean,
  now: Date = new Date(),
): boolean {
  if (!isOpenFlag) return false;

  /*
    Jadval umuman kiritilmagan bo'lsa, BAYROQQA suyanamiz.

    Aks holda jadvali yo'q barcha eski restoranlar birdaniga
    "yopiq" bo'lib qolardi — bu ko'chirish kunidagi eng yomon
    natija bo'lardi.
  */
  if (hours.length === 0) return true;

  return isOpenAt(hours, now);
}

/** Holat haqida qisqa matn. */
export interface OpenState {
  isOpen: boolean;
  /** "22:00 gacha ochiq" yoki "Ertaga 09:00 da ochiladi". */
  text: string;
}

/**
 * Hozirgi holat va KEYINGI o'zgarish.
 *
 * ── Nima uchun shunchaki "ochiq/yopiq" yetmaydi ───────────────────────
 * "Yopiq" degan yozuvni ko'rgan odam sahifadan chiqib ketadi.
 * "Ertaga 09:00 da ochiladi" esa unga qaytish uchun sabab beradi.
 *
 * "22:00 gacha ochiq" ham muhim: soat 21:50 da buyurtma berayotgan
 * odam shoshilishi kerakligini biladi.
 */
export function describeOpenState(
  hours: readonly DayHours[],
  isOpenFlag: boolean,
  now: Date = new Date(),
): OpenState {
  if (!isOpenFlag) {
    return { isOpen: false, text: 'Vaqtincha yopiq' };
  }

  if (hours.length === 0) {
    return { isOpen: true, text: 'Buyurtma qabul qilinmoqda' };
  }

  const { weekday, minutes } = tashkentNow(now);

  if (isOpenAt(hours, now)) {
    const today = hours.find((day) => day.weekday === weekday);
    const yesterday = hours.find((day) => day.weekday === (weekday + 6) % 7);

    /*
      Yopilish vaqti qaysi yozuvdan olinishi kerakligini aniqlaymiz:
      hozir kechagi tungi smenaning davomi bo'lishi mumkin.
    */
    const closesAt =
      today && !isOvernight(today) && minutes >= today.opensAt && minutes < today.closesAt
        ? today.closesAt
        : today && isOvernight(today) && minutes >= today.opensAt
          ? today.closesAt
          : (yesterday?.closesAt ?? null);

    return {
      isOpen: true,
      text: closesAt === null ? 'Ochiq' : `${formatMinutes(closesAt)} gacha ochiq`,
    };
  }

  const next = findNextOpening(hours, weekday, minutes);

  return { isOpen: false, text: next };
}

/**
 * Keyingi ochilish vaqtini topadi.
 *
 * Bir hafta oldinga qaraydi: hamma kun yopiq bo'lsa (jadval xato
 * kiritilgan bo'lsa) halqa cheksiz aylanmasligi kerak.
 */
function findNextOpening(hours: readonly DayHours[], weekday: number, minutes: number): string {
  for (let offset = 0; offset < 7; offset += 1) {
    const day = hours.find((row) => row.weekday === (weekday + offset) % 7);

    if (!day) continue;

    // Bugun, lekin hali ochilmagan.
    if (offset === 0 && minutes < day.opensAt) {
      return `${formatMinutes(day.opensAt)} da ochiladi`;
    }

    if (offset === 1) {
      return `Ertaga ${formatMinutes(day.opensAt)} da ochiladi`;
    }

    if (offset > 1) {
      return `${WEEKDAY_LABELS[day.weekday]} kuni ${formatMinutes(day.opensAt)} da ochiladi`;
    }
  }

  return 'Yopiq';
}

/** Jadvaldagi bitta qator — ekran uchun. */
export interface ScheduleRow {
  /** "Dushanba" yoki "Du — Ju". */
  days: string;
  /** "09:00 — 22:00" yoki "Dam olish". */
  time: string;
  /** Bugungi kun shu qatorga kiradimi. */
  isToday: boolean;
}

/**
 * Haftalik jadvalni ekranga tayyorlaydi.
 *
 * ── Nima uchun kunlar BIRLASHTIRILADI ─────────────────────────────────
 * Ettita alohida qator ekranning yarmini egallaydi va odam ularni
 * o'qimaydi.
 *
 * Ketma-ket kelgan bir xil kunlar birlashtirilsa, odatiy restoran
 * ikki qatorga sig'adi: "Du — Ju 09:00 — 22:00" va
 * "Sha — Yak 10:00 — 23:00". Buni bir qarashda tushunish mumkin.
 */
export function buildSchedule(
  hours: readonly DayHours[],
  now: Date = new Date(),
): ScheduleRow[] {
  const today = tashkentNow(now).weekday;

  const byWeekday = new Map(hours.map((day) => [day.weekday, day]));

  /** Har bir kun uchun matn — birlashtirish shu bo'yicha qilinadi. */
  const timeOf = (weekday: number): string => {
    const day = byWeekday.get(weekday);

    if (!day) return 'Dam olish';

    return `${formatMinutes(day.opensAt)} — ${formatMinutes(day.closesAt)}`;
  };

  const rows: ScheduleRow[] = [];

  let index = 0;

  while (index < WEEK_ORDER.length) {
    const startDay = WEEK_ORDER[index];
    const time = timeOf(startDay);

    // Ketma-ket kelgan bir xil kunlarni yig'amiz.
    let end = index;

    while (end + 1 < WEEK_ORDER.length && timeOf(WEEK_ORDER[end + 1]) === time) {
      end += 1;
    }

    const endDay = WEEK_ORDER[end];

    rows.push({
      days:
        index === end
          ? WEEKDAY_LABELS[startDay]
          : `${WEEKDAY_SHORT[startDay]} — ${WEEKDAY_SHORT[endDay]}`,
      time,
      isToday: WEEK_ORDER.slice(index, end + 1).includes(today),
    });

    index = end + 1;
  }

  return rows;
}

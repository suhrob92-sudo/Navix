import type { HotelRoomView } from '@/modules/hotel/hotel.types';

/**
 * Xona taqqoslash — qoidalar.
 *
 * ── Nima uchun bu bosqich kerak bo'ldi ────────────────────────────────
 * Mehmonxonada odatda uch-to'rt xona turi bo'ladi: "Standart",
 * "Komfort", "Lyuks". Ular bir-biridan bir necha kichik narsa bilan
 * farq qiladi va bu farq ro'yxatda KO'RINMAYDI.
 *
 * Odam telefon ekranida yuqoriga-pastga surib, "Standartda nechta
 * odam sig'ardi?" deb esdan chiqaradi. Keyin taxminan tanlaydi va
 * ko'pincha xato tanlaydi.
 *
 * ── Nima uchun faqat FARQ ajratiladi ──────────────────────────────────
 * Jadvalda hamma qator bir xil ko'rinsa, odam uni yana o'qib
 * chiqishi kerak bo'ladi.
 *
 * Aslida qaror FARQ ustida qabul qilinadi: narx boshqa,
 * sig'imi boshqa. Bir xil qatorlar esa shovqin. Shuning uchun
 * har bir qator "farq qiladimi" degan belgi bilan keladi va
 * ekranda ular ajratib ko'rsatiladi.
 */

/**
 * Bir vaqtda taqqoslanadigan xonalarning ENG KO'P soni.
 *
 * ── Nima uchun uchta ──────────────────────────────────────────────────
 * Telefon ekranida 400 piksel bor. To'rtta ustun bo'lsa, har biriga
 * 90 piksel qoladi va narx sig'maydi.
 *
 * Uchtasi ham chegara: ikkitasi qulayroq, lekin "Standart, Komfort,
 * Lyuks" — eng ko'p uchraydigan uchlik va uni bo'lib taqqoslash
 * ma'nosiz bo'lardi.
 */
export const MAX_COMPARE_ROOMS = 3;

/** Taqqoslash jadvalidagi bitta qator. */
export interface CompareRow {
  /** Qator nomi: "Narx", "Sig'imi". */
  label: string;
  /** Har bir xona uchun qiymat — xonalar tartibida. */
  values: string[];
  /**
   * Qiymatlar FARQ qiladimi.
   *
   * Bir xil bo'lsa `false` — bunday qator qaror qabul qilishga
   * yordam bermaydi va ekranda so'nib turadi.
   */
  differs: boolean;
}

/** Qiymatlarni matnga aylantiruvchilar. */
export interface CompareFormatters {
  /** Narxni matnga (TIYINDAN). */
  price: (tiyin: number) => string;
}

/**
 * Taqqoslash jadvalini yasaydi.
 *
 * ── Nima uchun BO'SH JOY ham qator ────────────────────────────────────
 * "Nechta bo'sh" — tanlovga eng ko'p ta'sir qiladigan ma'lumot:
 * eng arzon xona bo'sh bo'lmasa, qolgan hamma taqqoslash behuda.
 *
 * Sana tanlanmagan bo'lsa (`availableRooms === null`) u "Sana
 * tanlang" deb ko'rsatiladi — nol deb ko'rsatish YOLG'ON bo'lardi.
 *
 * @param rooms Taqqoslanadigan xonalar — tartibi saqlanadi.
 * @param nights Nechta kecha. Nol bo'lsa "jami" qatori chizilmaydi.
 */
export function buildComparison(
  rooms: readonly HotelRoomView[],
  nights: number,
  format: CompareFormatters,
): CompareRow[] {
  if (rooms.length === 0) return [];

  const rows: CompareRow[] = [];

  const add = (label: string, values: string[]) => {
    rows.push({ label, values, differs: new Set(values).size > 1 });
  };

  add(
    'Bir kecha',
    rooms.map((room) => format.price(room.pricePerNight)),
  );

  if (nights > 0) {
    /*
      Jami summa — aynan shu son hamyondan yechiladi. Uni odam
      o'zi ko'paytirib hisoblashi kerak bo'lmasin.
    */
    add(
      `${nights} kecha uchun`,
      rooms.map((room) => format.price(room.pricePerNight * nights)),
    );
  }

  add(
    "Sig'imi",
    rooms.map((room) => `${room.capacity} kishi`),
  );

  add(
    "Bo'sh xona",
    rooms.map((room) =>
      room.availableRooms === null
        ? 'Sana tanlang'
        : room.availableRooms === 0
          ? "Yo'q"
          : `${room.availableRooms} ta`,
    ),
  );

  add(
    'Tavsifi',
    rooms.map((room) => room.description ?? '—'),
  );

  return rows;
}

/**
 * Taqqoslashga yana xona qo'shish MUMKINMI.
 *
 * Chegaraga yetganda tugmalar o'chiriladi. Jimgina e'tiborsiz
 * qoldirish yomonroq bo'lardi: odam bosadi va hech narsa
 * bo'lmaydi, sababini esa bilmaydi.
 */
export function canAddToCompare(selectedCount: number): boolean {
  return selectedCount < MAX_COMPARE_ROOMS;
}

/**
 * Tanlovni almashtiradi: bor bo'lsa olib tashlaydi, yo'q bo'lsa qo'shadi.
 *
 * Chegaradan oshib ketmaydi — bosish shunchaki e'tiborsiz qoladi
 * (tugma allaqachon o'chirilgan bo'lishi kerak).
 */
export function toggleCompare(selected: readonly string[], roomId: string): string[] {
  if (selected.includes(roomId)) return selected.filter((id) => id !== roomId);

  if (!canAddToCompare(selected.length)) return [...selected];

  return [...selected, roomId];
}

/**
 * Eng arzon xonaning O'RNI (indeksi).
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Jadvalda uchta narx yonma-yon tursa ham, ko'z ularni darhol
 * solishtira olmaydi — raqamlar uzun va o'xshash.
 *
 * Eng arzoni belgilansa, taqqoslash bir qarashda tugaydi.
 *
 * @returns Bir nechta xona bir xil narxda bo'lsa `null` — o'shanda
 *   "eng arzon" degan belgi ma'nosini yo'qotadi.
 */
export function cheapestIndex(rooms: readonly HotelRoomView[]): number | null {
  if (rooms.length < 2) return null;

  const prices = rooms.map((room) => room.pricePerNight);
  const min = Math.min(...prices);

  if (prices.filter((price) => price === min).length > 1) return null;

  return prices.indexOf(min);
}

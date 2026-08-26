/**
 * Yagona qidiruv — bo'limlar va qoidalar.
 *
 * ── Nima uchun bu bosqich kerak bo'ldi ────────────────────────────────
 * Navixda oltita boshqa-boshqa katalog bor: mahsulot, taom,
 * mehmonxona, vakansiya, odam va xabar. Har birining o'z qidiruvi
 * bor edi va ular o'z sahifasida turardi.
 *
 * Odam esa "plov" deb yozganda nima izlayotganini oldindan
 * bilmaydi: restoranmi, taommi, balki do'stining xabarimi. Uni
 * "avval to'g'ri bo'limni tanlang" deb majburlash — ilovani
 * qidiruv tizimidan katalogga aylantiradi.
 *
 * ── Nima uchun natija GURUHLANADI ─────────────────────────────────────
 * Hammasini bitta ro'yxatga qo'yish mumkin edi va u "aqlliroq"
 * ko'rinardi. Lekin unda taom bilan odam yonma-yon turardi va
 * ularni solishtirish mumkin emas: qaysi biri "yuqoriroq"?
 *
 * Guruhlangan ro'yxatda esa ko'z avval BO'LIMNI tanlaydi, keyin
 * ichidagi natijani — bu ancha tez.
 */

/** Qidiruv bo'limi. */
export type SearchGroupKey = 'PRODUCT' | 'MENU_ITEM' | 'HOTEL' | 'VACANCY' | 'USER' | 'MESSAGE';

export interface SearchGroupMeta {
  key: SearchGroupKey;
  /** Ekrandagi sarlavha. */
  label: string;
  /** `lucide-react` ikonkasi nomi. */
  icon: string;
  /**
   * Faqat KIRGAN foydalanuvchi uchunmi.
   *
   * Xabarlar shaxsiy: ular hech qachon kirmagan odamga
   * ko'rsatilmaydi va so'rov ham yuborilmaydi.
   */
  requiresAuth: boolean;
}

/**
 * Bo'limlar — EKRANDAGI tartibda.
 *
 * ── Nima uchun aynan bu tartib ────────────────────────────────────────
 * Tepada eng ko'p qidiriladigan narsalar turadi. Navixda odam
 * kuniga bir necha marta ovqat va mahsulot izlaydi, mehmonxonani
 * esa yiliga bir necha marta.
 *
 * Odam va xabar pastda: ularni izlayotgan odam odatda "@" bilan
 * boshlaydi yoki suhbatlar bo'limiga kiradi.
 */
export const SEARCH_GROUPS: readonly SearchGroupMeta[] = [
  { key: 'MENU_ITEM', label: 'Taomlar', icon: 'UtensilsCrossed', requiresAuth: false },
  { key: 'PRODUCT', label: 'Mahsulotlar', icon: 'Package', requiresAuth: false },
  { key: 'HOTEL', label: 'Mehmonxonalar', icon: 'Building2', requiresAuth: false },
  { key: 'VACANCY', label: 'Vakansiyalar', icon: 'Briefcase', requiresAuth: false },
  { key: 'USER', label: 'Odamlar', icon: 'Users', requiresAuth: true },
  { key: 'MESSAGE', label: 'Xabarlar', icon: 'MessageSquare', requiresAuth: true },
];

/**
 * Qidiruv boshlanadigan ENG KAM uzunlik.
 *
 * ── Nima uchun ikkita harf ────────────────────────────────────────────
 * Bitta harf bo'yicha qidiruv deyarli butun katalogni qaytaradi:
 * "a" harfi minglab yozuvda uchraydi. Bunday natija foydasiz,
 * lekin oltita jadval bo'ylab og'ir so'rov ketadi.
 */
export const MIN_QUERY_LENGTH = 2;

/**
 * Har bo'limdan ko'rsatiladigan natijalar soni.
 *
 * ── Nima uchun beshta ─────────────────────────────────────────────────
 * Oltita bo'lim × 5 = 30 qator. Telefon ekranida bu ikki-uch
 * varaq — ko'proq bo'lsa odam pastdagi bo'limlarga umuman
 * yetib bormaydi.
 *
 * Bo'lim ichida ko'proq ko'rish uchun "hammasini ko'rish" havolasi
 * bor: u o'sha bo'limning O'Z sahifasiga olib boradi, u yerda
 * filtrlar ham ishlaydi.
 */
export const RESULTS_PER_GROUP = 5;

/**
 * So'rov ODAM qidiryaptimi.
 *
 * "@" bilan boshlangan so'rov aniq: bunday odam taksi yoki pizza
 * izlamayotgani ravshan va qolgan bo'limlar ro'yxatni bekorga
 * uzaytirardi.
 */
export function isPeopleQuery(query: string): boolean {
  return query.trim().startsWith('@');
}

/**
 * Shu so'rov uchun QAYSI bo'limlar so'raladi.
 *
 * ── Nima uchun bu qaror SERVERDA emas, sozlamada ──────────────────────
 * Uni server ichida yozish mumkin edi, lekin o'shanda brauzer ham
 * bilmasdi: ekranda "Xabarlar" degan bo'sh bo'lim ko'rinib turardi
 * va odam "xabarim yo'q ekan" deb o'ylardi — aslida so'rov umuman
 * yuborilmagan.
 *
 * Bitta sozlama ikkalasiga ham xizmat qiladi.
 */
export function groupsForQuery(query: string, isAuthenticated: boolean): SearchGroupKey[] {
  const trimmed = query.trim();

  if (trimmed.length < MIN_QUERY_LENGTH) return [];

  if (isPeopleQuery(trimmed)) {
    /*
      "@" bilan boshlangan so'rovda faqat odamlar. Xabarlar ham
      qo'shilishi mumkin edi, lekin "@aziz" degan matn xabar
      ichida kamdan-kam uchraydi.
    */
    return isAuthenticated ? ['USER'] : [];
  }

  return SEARCH_GROUPS.filter((group) => !group.requiresAuth || isAuthenticated).map((group) => group.key);
}

/**
 * Natijalarni MOSLIK bo'yicha tartiblaydi.
 *
 * ── Nima uchun kerak ──────────────────────────────────────────────────
 * Baza "ichida bor" degan shart bo'yicha topadi va tartib tasodifiy
 * bo'ladi: "non" so'roviga "Nonushta to'plami" birinchi, "Non" esa
 * beshinchi chiqishi mumkin.
 *
 * Odam esa aynan yozgan so'zi bilan BOSHLANADIGAN natijani kutadi.
 *
 * @param needle Tozalangan so'rov (`toSearchText` dan o'tgan).
 * @param keyOf Yozuvdan solishtiriladigan matnni oladi.
 */
export function rankByMatch<T>(items: readonly T[], needle: string, keyOf: (item: T) => string): T[] {
  const score = (item: T): number => {
    const value = keyOf(item);

    if (value.startsWith(needle)) return 0;
    if (value.includes(` ${needle}`)) return 1;

    return 2;
  };

  /*
    Tartib BARQAROR bo'lishi kerak: bir xil ballda dastlabki tartib
    saqlanadi. Aks holda sahifa har yangilanganda ro'yxat
    o'zgarardi.
  */
  return items
    .map((item, index) => ({ item, index, score: score(item) }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .map((entry) => entry.item);
}

/** Bo'limning O'Z sahifasi — "hammasini ko'rish" uchun. */
export function groupSearchPath(key: SearchGroupKey, query: string): string {
  const encoded = encodeURIComponent(query.trim());

  switch (key) {
    case 'MENU_ITEM':
      return `/food?search=${encoded}`;
    case 'PRODUCT':
      return `/marketplace?search=${encoded}`;
    case 'HOTEL':
      return `/hotel?search=${encoded}`;
    case 'VACANCY':
      return `/jobs?search=${encoded}`;
    case 'USER':
      return `/search?q=${encoded}`;
    case 'MESSAGE':
      return `/chat/search?q=${encoded}`;
  }
}

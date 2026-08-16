import type { PostCategoryName } from '@/modules/feed/feed.types';

/**
 * Lenta tartiblash — SOF hisob-kitob.
 *
 * ── Nima uchun bu fayl bazaga TEGMAYDI ────────────────────────────────
 * Tavsiya mantiqi eng oson buziladigan joy: bitta og'irlikni
 * o'zgartirsangiz, lenta butunlay boshqacha bo'lib qoladi va buni
 * ko'z bilan payqash qiyin.
 *
 * Shuning uchun butun hisob shu yerda — bazasiz, tarmoqsiz, sof
 * funksiya sifatida. Uni sinov bilan har tomondan tekshirish mumkin
 * va natija har doim bir xil.
 *
 * ── Bu "AI" emas, buni ochiq aytish kerak ─────────────────────────────
 * Bu yerda neyron tarmoq ham, til modeli ham yo'q. Bu — ODAMNING
 * xatti-harakatidan o'rganadigan ochiq formulali tartiblash.
 *
 * Uning afzalligi aynan shunda: nima uchun aynan shu post yuqorida
 * turgani har doim tushuntirib beriladi ("siz restoranlarni ko'p
 * yoqtirasiz"). Neyron tarmoq buni ayta olmasdi.
 */

/**
 * Har bir omilning OG'IRLIGI.
 *
 * ── Nima uchun bitta joyda ────────────────────────────────────────────
 * Ular kod bo'ylab sochilib ketsa, "nega bu post yuqorida?" degan
 * savolga javob topish uchun o'nta faylni ochish kerak bo'lardi.
 *
 * ── Nima uchun aynan shu raqamlar ─────────────────────────────────────
 * Tartib muhim, aniq qiymat emas:
 *   · YANGILIK eng og'ir — eski post qanchalik mos bo'lmasin,
 *     lenta "o'lik" ko'rinmasligi kerak;
 *   · OBUNA undan sal past — odam o'zi tanlagan mualliflarni
 *     ko'rishni xohlaydi, lekin faqat ularni emas;
 *   · O'RGANILGAN qiziqish undan past — u taxmin, odamning aniq
 *     tanlovi emas;
 *   · MASHHURLIK eng past — u boshqalarning fikri, meniki emas.
 */
export const RANKING_WEIGHTS = {
  /** Post qanchalik yangi. */
  recency: 1,
  /** Muallifga obunaman. */
  following: 0.8,
  /** Bo'limni sozlamalarda O'ZIM tanlaganman. */
  chosenInterest: 0.6,
  /** Shu bo'limdagi postlarni ko'p yoqtiraman (o'rganilgan). */
  categoryAffinity: 0.5,
  /** Shu muallifning postlarini ko'p yoqtiraman (o'rganilgan). */
  authorAffinity: 0.45,
  /** Post boshqalarga yoqqan. */
  engagement: 0.3,
} as const;

/**
 * Jarimalar.
 *
 * ── Nima uchun KO'RILGAN post jarimasi eng katta ──────────────────────
 * "Ko'rganimni qayta ko'rsatma" — tavsiyaning eng sezilarli qoidasi.
 * Odam lentani ochib, kechagi bir xil beshta videoni ko'rsa, "bu
 * yerda yangi narsa yo'q" deb chiqib ketadi.
 *
 * Jarima barcha ijobiy omillar yig'indisidan KATTA: ya'ni ko'rilgan
 * post qanchalik mos bo'lmasin, ko'rilmaganidan pastda turadi.
 */
export const RANKING_PENALTIES = {
  seen: 4,
  /**
   * O'z posti.
   *
   * Kichik jarima: u lentada ko'rinishi kerak (odam "ketdimi?" deb
   * tekshiradi), lekin o'z postlari lentani egallab olmasligi ham
   * kerak.
   */
  own: 0.5,
} as const;

/**
 * Yangilik yarim umri (soat).
 *
 * 48 soatdan keyin postning "yangilik" bahosi ikki barobar
 * pasayadi. Bir haftalik post deyarli nolga tushadi.
 *
 * ── Nima uchun 48, 24 emas ────────────────────────────────────────────
 * Hozircha kuniga o'nlab post joylanadi, minglab emas. 24 soat bilan
 * dam olish kunlari joylangan yaxshi post dushanbaga yetmay
 * lentadan tushib ketardi.
 */
export const RECENCY_HALF_LIFE_HOURS = 48;

/** Tartiblash uchun bitta postning kerakli minimumi. */
export interface RankableCandidate {
  id: string;
  authorId: string;
  category: PostCategoryName | null;
  createdAt: Date;
  likeCount: number;
  commentCount: number;
  viewCount: number;
}

/** Odamning o'rganilgan didi. */
export interface TasteProfile {
  /** Bo'lim → 0..1 oralig'idagi yaqinlik. */
  categoryAffinity: Map<PostCategoryName, number>;
  /** Muallif ID → 0..1 oralig'idagi yaqinlik. */
  authorAffinity: Map<string, number>;
  /** Sozlamalarda o'zi tanlagan bo'limlar. */
  chosenInterests: Set<PostCategoryName>;
  /** Obuna bo'lgan mualliflar. */
  followingIds: Set<string>;
  /** Allaqachon ko'rilgan postlar. */
  seenPostIds: Set<string>;
  /** So'rov yuborgan odamning o'zi. */
  viewerId: string;
}

/**
 * Yangilik bahosi — 1 dan 0 gacha.
 *
 * ── Nima uchun EKSPONENTA, chiziq emas ────────────────────────────────
 * Chiziqli pasayishda bir kunlik va uch kunlik post orasidagi farq
 * bir xil bo'lardi. Aslida esa birinchi kunlar ancha muhim: bugungi
 * post kechagidan sezilarli qiziqroq, o'ttizinchi va o'ttiz
 * birinchi kundagilar esa deyarli teng.
 */
export function recencyScore(createdAt: Date, now: Date): number {
  const hours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  // Kelajakdagi sana (soat noto'g'ri qo'yilgan) eng yangi hisoblanadi.
  if (hours <= 0) return 1;

  return 0.5 ** (hours / RECENCY_HALF_LIFE_HOURS);
}

/**
 * Mashhurlik bahosi — 0 dan 1 gacha.
 *
 * ── Nima uchun LOGARIFM ───────────────────────────────────────────────
 * Oddiy son bilan bitta viral video (10 000 yoqtirish) qolgan
 * hammasini bosib ketardi. Logarifm esa farqni yumshatadi: 10 va
 * 100 yoqtirish orasidagi farq 1000 va 10 000 orasidagi bilan
 * taxminan teng bo'ladi.
 *
 * ── Nima uchun izoh yoqtirishdan OG'IRROQ ─────────────────────────────
 * Yoqtirish — bir bosish. Izoh yozish esa vaqt talab qiladi, ya'ni
 * post odamni haqiqatan qiziqtirgan.
 */
export function engagementScore(candidate: RankableCandidate): number {
  const raw = candidate.likeCount + candidate.commentCount * 3 + candidate.viewCount * 0.1;

  if (raw <= 0) return 0;

  // log10(1000) = 3 → shu chegara "juda mashhur" deb qabul qilinadi.
  return Math.min(1, Math.log10(1 + raw) / 3);
}

/**
 * Bitta postning umumiy bahosi.
 *
 * Baho qanchalik katta bo'lsa, post lentada shunchalik yuqorida
 * turadi. Manfiy ham bo'lishi mumkin (ko'rilgan post).
 */
export function scoreCandidate(
  candidate: RankableCandidate,
  taste: TasteProfile,
  now: Date,
): number {
  let score = recencyScore(candidate.createdAt, now) * RANKING_WEIGHTS.recency;

  if (taste.followingIds.has(candidate.authorId)) {
    score += RANKING_WEIGHTS.following;
  }

  if (candidate.category !== null) {
    if (taste.chosenInterests.has(candidate.category)) {
      score += RANKING_WEIGHTS.chosenInterest;
    }

    score += (taste.categoryAffinity.get(candidate.category) ?? 0) * RANKING_WEIGHTS.categoryAffinity;
  }

  score += (taste.authorAffinity.get(candidate.authorId) ?? 0) * RANKING_WEIGHTS.authorAffinity;
  score += engagementScore(candidate) * RANKING_WEIGHTS.engagement;

  if (taste.seenPostIds.has(candidate.id)) {
    score -= RANKING_PENALTIES.seen;
  }

  if (candidate.authorId === taste.viewerId) {
    score -= RANKING_PENALTIES.own;
  }

  return score;
}

/**
 * Nomzodlarni bahoga qarab saralaydi.
 *
 * ── Nima uchun teng bahoda ID bo'yicha ────────────────────────────────
 * Ikkita post bir xil baho olsa (masalan ikkalasi ham bir vaqtda
 * joylangan va hech qanday signal yo'q), tartib har so'rovda
 * o'zgarib turardi. Unda ikkinchi sahifada post takrorlanishi yoki
 * tushib qolishi mumkin edi.
 *
 * ID bo'yicha qo'shimcha saralash tartibni QAT'IY qiladi.
 */
export function rankCandidates(
  candidates: RankableCandidate[],
  taste: TasteProfile,
  now: Date,
): string[] {
  return candidates
    .map((candidate) => ({ id: candidate.id, score: scoreCandidate(candidate, taste, now) }))
    .sort((a, b) => (b.score === a.score ? (a.id < b.id ? -1 : 1) : b.score - a.score))
    .map((row) => row.id);
}

/**
 * Xom sonlarni 0..1 oralig'iga keltiradi.
 *
 * ── Nima uchun eng kattasiga bo'linadi ────────────────────────────────
 * Odamning o'nta yoqtirishi ham, mingtasi ham bor. Xom sonni
 * ishlatsak, faol odamning bahosi hamma narsani bosib ketardi.
 *
 * Eng ko'p uchragan qiymatga bo'lish "shu odamning o'zi uchun
 * qanchalik ko'p" degan nisbiy javob beradi.
 */
export function normalizeCounts<Key>(counts: Map<Key, number>): Map<Key, number> {
  let max = 0;

  for (const value of counts.values()) {
    if (value > max) max = value;
  }

  if (max === 0) return new Map();

  const result = new Map<Key, number>();

  for (const [key, value] of counts) {
    result.set(key, value / max);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────
// "Nima uchun buni ko'ryapman?"
// ─────────────────────────────────────────────────────────────────────

/**
 * Sabab turlari.
 *
 * ── Nima uchun KOD, tayyor matn emas ──────────────────────────────────
 * Matn ekranga tegishli va u o'zgarishi mumkin (til, uslub, uzunlik).
 * Hisob esa serverda bajariladi. Ikkalasini aralashtirsak, matnni
 * o'zgartirish uchun server kodini tahrirlash kerak bo'lardi.
 */
export const REASON_CODES = [
  'FOLLOWING',
  'CHOSEN_INTEREST',
  'LEARNED_INTEREST',
  'AUTHOR_AFFINITY',
  'POPULAR',
  'RECENT',
  'OWN',
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

export interface RankingReason {
  code: ReasonCode;
  /** Shu omil bahoga qancha qo'shgan — saralash uchun. */
  contribution: number;
  /**
   * Sababga tegishli qiymat: bo'lim nomi.
   *
   * Muallif nomi bu yerda YO'Q: tartiblash faqat ID bilan ishlaydi
   * va ismni bilmaydi. Uni xizmat qatlami qo'shadi.
   */
  category?: PostCategoryName;
}

/**
 * Nima uchun bu post shu o'rinda turibdi.
 *
 * ── Nima uchun bu funksiya `scoreCandidate` BILAN BIR JOYDA ───────────
 * Ikkalasi AYNAN bir xil og'irliklarni ishlatadi. Alohida yozilsa,
 * ertaga og'irlik o'zgarganda biri yangilanib, ikkinchisi eskicha
 * qolardi — va ilova odamga YOLG'ON sabab aytardi.
 *
 * Bu eng yomon holat: tushuntirish noto'g'ri bo'lsa, undan
 * butunlay voz kechgan ma'qul.
 *
 * ── Nima uchun eng KATTA hissa birinchi ───────────────────────────────
 * Odam "nega?" deb so'raganda bitta aniq javob kutadi, beshta
 * omilning ro'yxatini emas. Eng kuchli sabab — eng halol javob.
 */
export function explainCandidate(
  candidate: RankableCandidate,
  taste: TasteProfile,
  now: Date,
): RankingReason[] {
  const reasons: RankingReason[] = [];

  if (candidate.authorId === taste.viewerId) {
    /*
      O'z posti — boshqa hech qanday sabab kerak emas.

      "Siz bu odamga obunasiz" deb aytish kulgili bo'lardi.
    */
    return [{ code: 'OWN', contribution: RANKING_WEIGHTS.recency }];
  }

  if (taste.followingIds.has(candidate.authorId)) {
    reasons.push({ code: 'FOLLOWING', contribution: RANKING_WEIGHTS.following });
  }

  if (candidate.category !== null) {
    if (taste.chosenInterests.has(candidate.category)) {
      reasons.push({
        code: 'CHOSEN_INTEREST',
        contribution: RANKING_WEIGHTS.chosenInterest,
        category: candidate.category,
      });
    }

    const learned = taste.categoryAffinity.get(candidate.category) ?? 0;

    if (learned > 0) {
      reasons.push({
        code: 'LEARNED_INTEREST',
        contribution: learned * RANKING_WEIGHTS.categoryAffinity,
        category: candidate.category,
      });
    }
  }

  const authorAffinity = taste.authorAffinity.get(candidate.authorId) ?? 0;

  if (authorAffinity > 0) {
    reasons.push({
      code: 'AUTHOR_AFFINITY',
      contribution: authorAffinity * RANKING_WEIGHTS.authorAffinity,
    });
  }

  const engagement = engagementScore(candidate);

  if (engagement > 0) {
    reasons.push({ code: 'POPULAR', contribution: engagement * RANKING_WEIGHTS.engagement });
  }

  reasons.push({
    code: 'RECENT',
    contribution: recencyScore(candidate.createdAt, now) * RANKING_WEIGHTS.recency,
  });

  /*
    Teng hissada tartib QAT'IY bo'lishi kerak.

    Aks holda bir xil post har so'rovda boshqacha sabab
    ko'rsatardi va odam ilovaga ishonmay qolardi.
  */
  return reasons.sort((a, b) =>
    b.contribution === a.contribution
      ? REASON_CODES.indexOf(a.code) - REASON_CODES.indexOf(b.code)
      : b.contribution - a.contribution,
  );
}

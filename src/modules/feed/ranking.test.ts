import { describe, expect, it } from 'vitest';

import {
  REASON_CODES,
  RANKING_PENALTIES,
  RANKING_WEIGHTS,
  RECENCY_HALF_LIFE_HOURS,
  engagementScore,
  explainCandidate,
  normalizeCounts,
  rankCandidates,
  recencyScore,
  scoreCandidate,
  type RankableCandidate,
  type TasteProfile,
} from '@/modules/feed/ranking';

const NOW = new Date('2026-08-18T12:00:00.000Z');

function hoursAgo(hours: number): Date {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000);
}

function candidate(overrides: Partial<RankableCandidate> = {}): RankableCandidate {
  return {
    id: 'p1',
    authorId: 'a1',
    category: null,
    createdAt: hoursAgo(1),
    likeCount: 0,
    commentCount: 0,
    viewCount: 0,
    ...overrides,
  };
}

function taste(overrides: Partial<TasteProfile> = {}): TasteProfile {
  return {
    categoryAffinity: new Map(),
    authorAffinity: new Map(),
    chosenInterests: new Set(),
    followingIds: new Set(),
    seenPostIds: new Set(),
    viewerId: 'me',
    ...overrides,
  };
}

/**
 * Tavsiya mantiqi — eng oson buziladigan joy.
 *
 * Bitta og'irlikni o'zgartirsangiz, lenta butunlay boshqacha bo'lib
 * qoladi va buni ko'z bilan payqash deyarli imkonsiz. Shuning uchun
 * har bir qoida alohida tekshiriladi.
 */
describe('recencyScore', () => {
  it('hozirgina joylangan post eng yuqori baho oladi', () => {
    expect(recencyScore(NOW, NOW)).toBe(1);
  });

  it('yarim umrdan keyin baho ikki barobar pasayadi', () => {
    expect(recencyScore(hoursAgo(RECENCY_HALF_LIFE_HOURS), NOW)).toBeCloseTo(0.5, 5);
    expect(recencyScore(hoursAgo(RECENCY_HALF_LIFE_HOURS * 2), NOW)).toBeCloseTo(0.25, 5);
  });

  it('eski post nolga yaqinlashadi, lekin manfiy bo\'lmaydi', () => {
    const old = recencyScore(hoursAgo(24 * 365), NOW);

    expect(old).toBeGreaterThan(0);
    expect(old).toBeLessThan(0.001);
  });

  it('kelajakdagi sana eng yangi hisoblanadi', () => {
    // Telefon soati noto'g'ri qo'yilgan bo'lishi mumkin — bu hisobni
    // buzmasligi kerak.
    expect(recencyScore(hoursAgo(-10), NOW)).toBe(1);
  });
});

describe('engagementScore', () => {
  it('hech kim tegmagan postda nol', () => {
    expect(engagementScore(candidate())).toBe(0);
  });

  it('izoh yoqtirishdan OG\'IRROQ', () => {
    // Yoqtirish — bir bosish. Izoh esa vaqt talab qiladi.
    const liked = engagementScore(candidate({ likeCount: 3 }));
    const commented = engagementScore(candidate({ commentCount: 3 }));

    expect(commented).toBeGreaterThan(liked);
  });

  it('viral post ham birdan oshmaydi', () => {
    // Chegarasiz bo'lsa, bitta viral video butun lentani egallardi.
    expect(engagementScore(candidate({ likeCount: 1_000_000 }))).toBe(1);
  });

  it('o\'sish sekinlashadi (logarifm)', () => {
    const ten = engagementScore(candidate({ likeCount: 10 }));
    const hundred = engagementScore(candidate({ likeCount: 100 }));
    const thousand = engagementScore(candidate({ likeCount: 1_000 }));

    // 10 → 100 va 100 → 1000 orasidagi o'sish taxminan teng.
    expect(hundred - ten).toBeCloseTo(thousand - hundred, 1);
  });
});

describe('scoreCandidate', () => {
  it('yangi post eskisidan yuqori', () => {
    const fresh = scoreCandidate(candidate({ createdAt: hoursAgo(1) }), taste(), NOW);
    const old = scoreCandidate(candidate({ createdAt: hoursAgo(200) }), taste(), NOW);

    expect(fresh).toBeGreaterThan(old);
  });

  it('obuna bo\'lgan muallif ustun', () => {
    const base = candidate();
    const plain = scoreCandidate(base, taste(), NOW);
    const followed = scoreCandidate(base, taste({ followingIds: new Set(['a1']) }), NOW);

    expect(followed - plain).toBeCloseTo(RANKING_WEIGHTS.following, 5);
  });

  it('O\'ZI tanlagan qiziqish o\'rganilganidan KUCHLIROQ', () => {
    // Aniq tanlov — taxmindan ustun.
    const base = candidate({ category: 'RESTAURANTS' });

    const chosen = scoreCandidate(base, taste({ chosenInterests: new Set(['RESTAURANTS']) }), NOW);
    const learned = scoreCandidate(
      base,
      taste({ categoryAffinity: new Map([['RESTAURANTS', 1]]) }),
      NOW,
    );

    expect(chosen).toBeGreaterThan(learned);
  });

  it('bo\'limsiz postga qiziqish bahosi qo\'shilmaydi', () => {
    const withoutCategory = scoreCandidate(
      candidate({ category: null }),
      taste({ chosenInterests: new Set(['JOBS']), categoryAffinity: new Map([['JOBS', 1]]) }),
      NOW,
    );

    expect(withoutCategory).toBeCloseTo(scoreCandidate(candidate({ category: null }), taste(), NOW), 5);
  });

  it('KO\'RILGAN post har qanday holatda pastda qoladi', () => {
    /*
      Bu eng muhim qoida: ko'rilgan post qanchalik mos bo'lmasin,
      ko'rilmaganidan pastda turishi kerak. Aks holda lenta har
      ochilganda bir xil beshta videoni qaytarardi.
    */
    const perfect = candidate({ id: 'seen', category: 'JOBS', likeCount: 10_000 });

    const seenScore = scoreCandidate(
      perfect,
      taste({
        seenPostIds: new Set(['seen']),
        followingIds: new Set(['a1']),
        chosenInterests: new Set(['JOBS']),
        categoryAffinity: new Map([['JOBS', 1]]),
        authorAffinity: new Map([['a1', 1]]),
      }),
      NOW,
    );

    // Eng oddiy, hech qanday signalsiz yangi post.
    const plainNew = scoreCandidate(candidate({ id: 'new', createdAt: NOW }), taste(), NOW);

    expect(seenScore).toBeLessThan(plainNew);
  });

  it('jarima barcha ijobiy omillardan katta', () => {
    const maxPositive = Object.values(RANKING_WEIGHTS).reduce((sum, value) => sum + value, 0);

    expect(RANKING_PENALTIES.seen).toBeGreaterThan(maxPositive);
  });

  it('o\'z posti biroz pastroq, lekin ko\'rinadi', () => {
    const base = candidate({ authorId: 'me' });

    const own = scoreCandidate(base, taste(), NOW);
    const other = scoreCandidate(candidate({ authorId: 'other' }), taste(), NOW);

    expect(other - own).toBeCloseTo(RANKING_PENALTIES.own, 5);
    // Lekin jarima kichik: o'z posti butunlay yo'qolib ketmasligi kerak.
    expect(RANKING_PENALTIES.own).toBeLessThan(RANKING_WEIGHTS.recency);
  });
});

describe('rankCandidates', () => {
  it('yuqori bahodagi post birinchi turadi', () => {
    const items = [
      candidate({ id: 'eski', createdAt: hoursAgo(300) }),
      candidate({ id: 'yangi', createdAt: hoursAgo(1) }),
    ];

    expect(rankCandidates(items, taste(), NOW)[0]).toBe('yangi');
  });

  it('teng bahoda tartib QAT\'IY (ID bo\'yicha)', () => {
    /*
      Tartib beqaror bo'lsa, ikkinchi sahifada post takrorlanishi
      yoki tushib qolishi mumkin edi.
    */
    const time = hoursAgo(5);
    const items = [candidate({ id: 'bbb', createdAt: time }), candidate({ id: 'aaa', createdAt: time })];

    expect(rankCandidates(items, taste(), NOW)).toEqual(['aaa', 'bbb']);
    expect(rankCandidates([...items].reverse(), taste(), NOW)).toEqual(['aaa', 'bbb']);
  });

  it('ko\'rilganlar ro\'yxat OXIRIGA tushadi', () => {
    const items = [
      candidate({ id: 'korilgan', createdAt: NOW }),
      candidate({ id: 'korilmagan', createdAt: hoursAgo(100) }),
    ];

    const ranked = rankCandidates(items, taste({ seenPostIds: new Set(['korilgan']) }), NOW);

    expect(ranked).toEqual(['korilmagan', 'korilgan']);
  });

  it('yoqtirilgan bo\'lim yuqoriga ko\'tariladi', () => {
    // Ikkalasi ham bir vaqtda joylangan — farq faqat bo'limda.
    const time = hoursAgo(10);
    const items = [
      candidate({ id: 'ish', category: 'JOBS', createdAt: time }),
      candidate({ id: 'restoran', category: 'RESTAURANTS', createdAt: time }),
    ];

    const ranked = rankCandidates(
      items,
      taste({ categoryAffinity: new Map([['RESTAURANTS', 1]]) }),
      NOW,
    );

    expect(ranked[0]).toBe('restoran');
  });

  it('bo\'sh ro\'yxatda bo\'sh natija', () => {
    expect(rankCandidates([], taste(), NOW)).toEqual([]);
  });
});

describe('normalizeCounts', () => {
  it('eng katta qiymat birga aylanadi', () => {
    const result = normalizeCounts(new Map([['a', 5], ['b', 10]]));

    expect(result.get('b')).toBe(1);
    expect(result.get('a')).toBe(0.5);
  });

  it('bo\'sh xaritada bo\'sh natija', () => {
    expect(normalizeCounts(new Map()).size).toBe(0);
  });

  it('hamma nol bo\'lsa bo\'sh qaytadi', () => {
    // Nolga bo'linish bo'lmasligi kerak.
    expect(normalizeCounts(new Map([['a', 0]])).size).toBe(0);
  });

  it('faol odamning bahosi ham birdan oshmaydi', () => {
    /*
      Xom son ishlatilsa, mingta yoqtirish qo'ygan odamning bahosi
      hamma narsani bosib ketardi.
    */
    const result = normalizeCounts(new Map([['a', 1_000], ['b', 1]]));

    for (const value of result.values()) {
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

/**
 * Tushuntirish HISOB bilan bir xil formuladan olinadi.
 *
 * Bu eng muhim shart: agar ular ajralib ketsa, ilova odamga
 * YOLG'ON sabab aytardi. Noto'g'ri tushuntirishdan ko'ra uni
 * umuman ko'rsatmagan ma'qul.
 */
describe('explainCandidate', () => {
  it("o'z posti uchun boshqa sabab qidirilmaydi", () => {
    const reasons = explainCandidate(
      candidate({ authorId: 'me', category: 'JOBS' }),
      taste({ chosenInterests: new Set(['JOBS']), followingIds: new Set(['me']) }),
      NOW,
    );

    // "Siz o'zingizga obunasiz" degan javob kulgili bo'lardi.
    expect(reasons).toHaveLength(1);
    expect(reasons[0].code).toBe('OWN');
  });

  it('obuna eng kuchli sabab bo\'ladi', () => {
    const reasons = explainCandidate(
      candidate({ createdAt: hoursAgo(100) }),
      taste({ followingIds: new Set(['a1']) }),
      NOW,
    );

    expect(reasons[0].code).toBe('FOLLOWING');
  });

  it("yangi postda va signalsiz — sabab YANGILIK", () => {
    const reasons = explainCandidate(candidate({ createdAt: NOW }), taste(), NOW);

    expect(reasons[0].code).toBe('RECENT');
  });

  it("O'ZI tanlagan qiziqish o'rganilganidan yuqori turadi", () => {
    const reasons = explainCandidate(
      candidate({ category: 'TRAVEL', createdAt: hoursAgo(200) }),
      taste({
        chosenInterests: new Set(['TRAVEL']),
        categoryAffinity: new Map([['TRAVEL', 1]]),
      }),
      NOW,
    );

    const codes = reasons.map((item) => item.code);

    expect(codes.indexOf('CHOSEN_INTEREST')).toBeLessThan(codes.indexOf('LEARNED_INTEREST'));
  });

  it('sabablar HISSA bo\'yicha tartiblangan', () => {
    const reasons = explainCandidate(
      candidate({ category: 'JOBS', likeCount: 50, createdAt: hoursAgo(10) }),
      taste({
        followingIds: new Set(['a1']),
        chosenInterests: new Set(['JOBS']),
        categoryAffinity: new Map([['JOBS', 0.5]]),
      }),
      NOW,
    );

    for (let index = 1; index < reasons.length; index += 1) {
      expect(reasons[index - 1].contribution).toBeGreaterThanOrEqual(reasons[index].contribution);
    }
  });

  it("signal YO'Q bo'lsa, o'sha sabab ro'yxatga tushmaydi", () => {
    const codes = explainCandidate(candidate({ category: 'JOBS' }), taste(), NOW).map((r) => r.code);

    // Hech narsa yoqtirilmagan — "yoqtirasiz" deb aytish yolg'on bo'lardi.
    expect(codes).not.toContain('LEARNED_INTEREST');
    expect(codes).not.toContain('AUTHOR_AFFINITY');
    expect(codes).not.toContain('FOLLOWING');
  });

  it("bo'limsiz postda bo'lim sabablari yo'q", () => {
    const codes = explainCandidate(
      candidate({ category: null }),
      taste({ chosenInterests: new Set(['JOBS']), categoryAffinity: new Map([['JOBS', 1]]) }),
      NOW,
    ).map((r) => r.code);

    expect(codes).not.toContain('CHOSEN_INTEREST');
    expect(codes).not.toContain('LEARNED_INTEREST');
  });

  it('har doim kamida BITTA sabab qaytadi', () => {
    // Bo'sh javob ekranda "sabab topilmadi" bo'lib chiqardi.
    expect(explainCandidate(candidate(), taste(), NOW).length).toBeGreaterThan(0);
  });

  it('barcha qaytgan kodlar ro\'yxatda bor', () => {
    const reasons = explainCandidate(
      candidate({ category: 'TRAVEL', likeCount: 10 }),
      taste({
        followingIds: new Set(['a1']),
        chosenInterests: new Set(['TRAVEL']),
        categoryAffinity: new Map([['TRAVEL', 1]]),
        authorAffinity: new Map([['a1', 1]]),
      }),
      NOW,
    );

    for (const reason of reasons) {
      expect(REASON_CODES).toContain(reason.code);
    }
  });

  it('tartib QAT\'IY — ikki marta chaqirilganda bir xil', () => {
    const args = [
      candidate({ category: 'JOBS', likeCount: 5 }),
      taste({ chosenInterests: new Set(['JOBS']) }),
      NOW,
    ] as const;

    expect(explainCandidate(...args).map((r) => r.code)).toEqual(
      explainCandidate(...args).map((r) => r.code),
    );
  });

  it('eng kuchli sabab HISOBDAGI eng katta hissaga mos', () => {
    /*
      Bu sinov tushuntirish bilan hisobning ajralib ketishini
      to'xtatadi: obuna og'irligi yangilikdan past, lekin eski
      postda yangilik bahosi tushadi — demak obuna ustun chiqadi.
    */
    const oldPost = candidate({ createdAt: hoursAgo(500) });
    const withFollow = taste({ followingIds: new Set(['a1']) });

    const reasons = explainCandidate(oldPost, withFollow, NOW);
    const total = scoreCandidate(oldPost, withFollow, NOW);

    expect(reasons[0].code).toBe('FOLLOWING');
    // Hissalar yig'indisi umumiy bahodan oshmasligi kerak.
    const sum = reasons.reduce((acc, item) => acc + item.contribution, 0);

    expect(sum).toBeCloseTo(total, 5);
  });
});

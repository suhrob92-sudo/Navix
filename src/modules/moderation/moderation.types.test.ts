import { describe, expect, it } from 'vitest';

import {
  adminReportQuerySchema,
  reportUserSchema,
  resolveReportSchema,
} from '@/modules/moderation/moderation.schemas';
import {
  messageDenyText,
  reportReasonLabel,
  REPORT_REASONS,
  REPORT_STATUS_LABELS,
  type MessageDenyReason,
  type ReportStatusName,
} from '@/modules/moderation/moderation.types';

describe('messageDenyText', () => {
  /**
   * ── Bu testning MA'NOSI ─────────────────────────────────────────────
   * Bloklanganlik oshkor bo'lmasligi kerak. Agar kimdir kelajakda
   * "aniqroq bo'lsin" deb matnni o'zgartirsa, bloklash himoyasi
   * shu daqiqada buziladi va buni hech kim sezmasdi.
   *
   * Shu sabab tekshiruv KOD emas, XULQ darajasida yozilgan.
   */
  it("bloklanganlikni maxfiy sozlamadan ajratib bo'lmaydi", () => {
    expect(messageDenyText('BLOCKED_BY_THEM')).toBe(messageDenyText('NOBODY'));
  });

  it("o'zim bloklagan holat boshqacha tushuntiriladi", () => {
    // Bu holatda yashiradigan narsa yo'q: bloklagan odam — men.
    expect(messageDenyText('BLOCKED_BY_ME')).not.toBe(messageDenyText('NOBODY'));
    expect(messageDenyText('BLOCKED_BY_ME')).toContain('blok');
  });

  it('har bir sabab uchun matn bor', () => {
    const reasons: MessageDenyReason[] = ['BLOCKED_BY_ME', 'BLOCKED_BY_THEM', 'FOLLOWERS_ONLY', 'NOBODY'];

    for (const reason of reasons) {
      expect(messageDenyText(reason).length).toBeGreaterThan(10);
    }
  });

  it("matnlarda egri apostrof yo'q", () => {
    const reasons: MessageDenyReason[] = ['BLOCKED_BY_ME', 'BLOCKED_BY_THEM', 'FOLLOWERS_ONLY', 'NOBODY'];

    for (const reason of reasons) {
      expect(messageDenyText(reason)).not.toMatch(/[‘’ʻʼ]/);
    }
  });
});

describe('reportReasonLabel', () => {
  it("har bir sabab o'zbekcha nom bilan chiqadi", () => {
    for (const reason of REPORT_REASONS) {
      expect(reportReasonLabel(reason.value)).toBe(reason.label);
    }
  });

  it("noma'lum sabab ham bo'sh katak bermaydi", () => {
    // Eski yozuvlar bazada qoladi — ro'yxat o'zgarsa ham sahifa buzilmasligi kerak.
    expect(reportReasonLabel('UNKNOWN' as never)).toBe('UNKNOWN');
  });
});

describe('REPORT_STATUS_LABELS', () => {
  it('uchala holat ham nomlangan', () => {
    const statuses: ReportStatusName[] = ['OPEN', 'REVIEWED', 'DISMISSED'];

    for (const status of statuses) {
      expect(REPORT_STATUS_LABELS[status].length).toBeGreaterThan(3);
    }
  });
});

describe('reportUserSchema', () => {
  it('sabab va izohni qabul qiladi', () => {
    const result = reportUserSchema.parse({ reason: 'FRAUD', note: '  Pul so\'radi  ' });

    // Izoh chetlaridagi bo'sh joy tozalanadi.
    expect(result).toEqual({ reason: 'FRAUD', note: "Pul so'radi" });
  });

  it("izohsiz ham o'tadi", () => {
    expect(reportUserSchema.parse({ reason: 'SPAM' }).note).toBeUndefined();
  });

  it("bo'sh izoh bazaga yozilmaydi", () => {
    // Aks holda moderator "izoh bor" deb ochib ko'rardi.
    expect(reportUserSchema.parse({ reason: 'SPAM', note: '   ' }).note).toBeUndefined();
  });

  it('juda uzun izoh rad etiladi', () => {
    const result = reportUserSchema.safeParse({ reason: 'SPAM', note: 'x'.repeat(501) });

    expect(result.success).toBe(false);
  });

  it("ro'yxatda yo'q sabab rad etiladi", () => {
    expect(reportUserSchema.safeParse({ reason: 'HACKING' }).success).toBe(false);
  });
});

describe('adminReportQuerySchema', () => {
  it('sukut bo\'yicha faqat ochiq shikoyatlar', () => {
    const result = adminReportQuerySchema.parse({});

    expect(result.status).toBe('OPEN');
    expect(result.page).toBe(1);
  });

  it('sahifa hajmi cheklangan', () => {
    // Cheksiz sahifa bilan butun ro'yxatni bir so'rovda yuklab olish mumkin bo'lardi.
    expect(adminReportQuerySchema.safeParse({ pageSize: 500 }).success).toBe(false);
  });
});

describe('resolveReportSchema', () => {
  it('yopish holatlarini qabul qiladi', () => {
    expect(resolveReportSchema.parse({ status: 'REVIEWED' }).status).toBe('REVIEWED');
    expect(resolveReportSchema.parse({ status: 'DISMISSED' }).status).toBe('DISMISSED');
  });

  it("yopilgan shikoyatni qayta ochib bo'lmaydi", () => {
    // Bu — moderator qarorini yashirincha bekor qilish yo'li bo'lardi.
    expect(resolveReportSchema.safeParse({ status: 'OPEN' }).success).toBe(false);
  });
});

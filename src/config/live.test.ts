import { describe, expect, it } from 'vitest';

import {
  LIVE_ENDED_VISIBLE_HOURS,
  LIVE_MAX_DAYS_AHEAD,
  LIVE_MIN_LEAD_MINUTES,
  LIVE_STATUSES,
  LIVE_STATUS_LABELS,
  LIVE_TRANSITIONS,
  MAX_SCHEDULED_LIVES,
  canChangeLiveStatus,
  type LiveStatus,
} from '@/config/live';
import { createLiveSchema, liveStatusSchema } from '@/modules/live/live.schemas';

describe('holatlar', () => {
  it("har bir holatda ekrandagi yozuv bor", () => {
    for (const status of LIVE_STATUSES) {
      expect(LIVE_STATUS_LABELS[status]).toBeTruthy();
    }
  });

  it("yozuvlar ro'yxatida ortiqchasi yo'q", () => {
    expect(Object.keys(LIVE_STATUS_LABELS).sort()).toEqual([...LIVE_STATUSES].sort());
  });

  it("har bir holat uchun o'tish qoidasi yozilgan", () => {
    /*
      Qoida yozilmagan holat `undefined` berardi va `canChange`
      chaqirilganda ilova yiqilardi.
    */
    for (const status of LIVE_STATUSES) {
      expect(Array.isArray(LIVE_TRANSITIONS[status]), status).toBe(true);
    }
  });
});

describe('canChangeLiveStatus', () => {
  it("rejadagi efirni boshlash va bekor qilish mumkin", () => {
    expect(canChangeLiveStatus('SCHEDULED', 'LIVE')).toBe(true);
    expect(canChangeLiveStatus('SCHEDULED', 'CANCELLED')).toBe(true);
  });

  it('efirdagi efirni faqat TUGATISH mumkin', () => {
    /*
      "Bekor qilish" bu yerda ma'nosiz: efir allaqachon bo'lib
      o'tdi va uni bo'lmagan qilib ko'rsatish yolg'on bo'lardi.
    */
    expect(canChangeLiveStatus('LIVE', 'ENDED')).toBe(true);
    expect(canChangeLiveStatus('LIVE', 'CANCELLED')).toBe(false);
    expect(canChangeLiveStatus('LIVE', 'SCHEDULED')).toBe(false);
  });

  it('TUGAGAN efirni qayta boshlab bo\'lmaydi', () => {
    /*
      ── ENG MUHIM qoida ────────────────────────────────────────────
      Qayta boshlashga ruxsat berilsa, eslatma qo'yganlarga IKKINCHI
      marta xabar ketardi. Bir necha marta bosilsa, odamlar
      xabarlarni butunlay o'chirib qo'yardi.
    */
    for (const to of LIVE_STATUSES) {
      expect(canChangeLiveStatus('ENDED', to), `ENDED -> ${to}`).toBe(false);
      expect(canChangeLiveStatus('CANCELLED', to), `CANCELLED -> ${to}`).toBe(false);
    }
  });

  it("hech bir holat O'ZIGA o'ta olmaydi", () => {
    for (const status of LIVE_STATUSES) {
      expect(canChangeLiveStatus(status, status), status).toBe(false);
    }
  });

  it("yakuniy holatlardan chiqish yo'li YO'Q", () => {
    const terminal: LiveStatus[] = ['ENDED', 'CANCELLED'];

    for (const status of terminal) {
      expect(LIVE_TRANSITIONS[status]).toEqual([]);
    }
  });
});

describe('createLiveSchema', () => {
  const soon = () => new Date(Date.now() + 60 * 60 * 1000).toISOString();

  it("to'g'ri e'lonni qabul qiladi", () => {
    const result = createLiveSchema.safeParse({ title: 'Osh pishiramiz', scheduledAt: soon() });

    expect(result.success).toBe(true);
  });

  it("bo'sh sarlavhani RAD etadi", () => {
    expect(createLiveSchema.safeParse({ title: '   ', scheduledAt: soon() }).success).toBe(false);
  });

  it('juda uzun sarlavhani rad etadi', () => {
    expect(
      createLiveSchema.safeParse({ title: 'a'.repeat(200), scheduledAt: soon() }).success,
    ).toBe(false);
  });

  it("O'TGAN vaqtni RAD etadi", () => {
    /*
      O'tgan vaqtga e'lon qo'yilsa, u ro'yxatning boshida turib
      qolardi va hech qachon boshlanmasdi.
    */
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    expect(createLiveSchema.safeParse({ title: 'Efir', scheduledAt: past }).success).toBe(false);
  });

  it("JUDA YAQIN vaqtni rad etadi", () => {
    /*
      E'lonning butun ma'nosi — odamlarga xabar berish. Bir
      daqiqadan keyingi efirni hech kim ko'rmasdi.
    */
    const tooSoon = new Date(Date.now() + (LIVE_MIN_LEAD_MINUTES - 2) * 60 * 1000).toISOString();

    expect(createLiveSchema.safeParse({ title: 'Efir', scheduledAt: tooSoon }).success).toBe(false);
  });

  it('JUDA UZOQ vaqtni rad etadi', () => {
    const tooFar = new Date(
      Date.now() + (LIVE_MAX_DAYS_AHEAD + 1) * 24 * 60 * 60 * 1000,
    ).toISOString();

    expect(createLiveSchema.safeParse({ title: 'Efir', scheduledAt: tooFar }).success).toBe(false);
  });

  it("buzuq vaqtni rad etadi", () => {
    expect(createLiveSchema.safeParse({ title: 'Efir', scheduledAt: 'ertaga' }).success).toBe(false);
  });
});

describe('liveStatusSchema', () => {
  it('har bir holat qabul qilinadi', () => {
    for (const status of LIVE_STATUSES) {
      expect(liveStatusSchema.safeParse({ status }).success, status).toBe(true);
    }
  });

  it("noma'lum holat RAD etiladi", () => {
    expect(liveStatusSchema.safeParse({ status: 'PAUSED' }).success).toBe(false);
  });
});

describe('chegaralar', () => {
  it('sonlar mantiqiy', () => {
    expect(MAX_SCHEDULED_LIVES).toBeGreaterThan(0);
    expect(LIVE_MIN_LEAD_MINUTES).toBeGreaterThan(0);
    expect(LIVE_ENDED_VISIBLE_HOURS).toBeGreaterThan(0);
    /* Eng kam kutish eng uzoq muddatdan kichik bo'lishi shart. */
    expect(LIVE_MIN_LEAD_MINUTES / (60 * 24)).toBeLessThan(LIVE_MAX_DAYS_AHEAD);
  });
});

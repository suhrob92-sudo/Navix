import { describe, expect, it } from 'vitest';

import { callSignalSchema, endCallSchema, startCallSchema } from '@/modules/call/call.schemas';
import {
  callStatusText,
  callSummaryText,
  formatCallDuration,
  isCallOver,
  type CallStatusName,
} from '@/modules/call/call.types';

describe('formatCallDuration', () => {
  it('daqiqa va soniyani ikki xonada yozadi', () => {
    expect(formatCallDuration(67)).toBe('1:07');
  });

  it('bir soatdan oshsa soat ham qo’shiladi', () => {
    expect(formatCallDuration(3_753)).toBe('1:02:33');
  });

  it('nol soniya ham to’g’ri ko’rinadi', () => {
    expect(formatCallDuration(0)).toBe('0:00');
  });

  it('manfiy qiymat nolga tenglashtiriladi', () => {
    // Soatlar farq qilsa hisob manfiy chiqishi mumkin — ekranda "-1:-5" turmasligi kerak.
    expect(formatCallDuration(-42)).toBe('0:00');
  });

  it('kasr soniya butunlanadi', () => {
    expect(formatCallDuration(59.8)).toBe('0:59');
  });
});

describe('isCallOver', () => {
  it('tugagan holatlarni taniydi', () => {
    const over: CallStatusName[] = ['ENDED', 'DECLINED', 'MISSED', 'FAILED'];

    for (const status of over) {
      expect(isCallOver(status)).toBe(true);
    }
  });

  it('jonli holatlarni tugagan deb hisoblamaydi', () => {
    expect(isCallOver('RINGING')).toBe(false);
    expect(isCallOver('ACTIVE')).toBe(false);
  });
});

describe('callSummaryText', () => {
  it('tugagan qo’ng’iroqda davomiylik ko’rsatiladi', () => {
    expect(callSummaryText({ status: 'ENDED', isOutgoing: true, durationSeconds: 125 })).toBe(
      "Chiquvchi qo'ng'iroq · 2:05",
    );
  });

  it('kiruvchi va chiquvchi farqlanadi', () => {
    expect(callSummaryText({ status: 'ENDED', isOutgoing: false, durationSeconds: 5 })).toBe(
      "Kiruvchi qo'ng'iroq · 0:05",
    );
  });

  it('javobsiz qo’ng’iroq ikki tomonda boshqacha yoziladi', () => {
    // Chaqiruvchi uchun "javob berilmadi", qabul qiluvchi uchun "javobsiz".
    expect(callSummaryText({ status: 'MISSED', isOutgoing: true, durationSeconds: 0 })).toBe('Javob berilmadi');
    expect(callSummaryText({ status: 'MISSED', isOutgoing: false, durationSeconds: 0 })).toBe(
      "Javobsiz qo'ng'iroq",
    );
  });

  it('rad etish ham ikki tomonda boshqacha', () => {
    expect(callSummaryText({ status: 'DECLINED', isOutgoing: true, durationSeconds: 0 })).toBe('Rad etildi');
    expect(callSummaryText({ status: 'DECLINED', isOutgoing: false, durationSeconds: 0 })).toBe(
      'Siz rad etdingiz',
    );
  });

  it('qolgan holatlar umumiy nom bilan', () => {
    expect(callSummaryText({ status: 'FAILED', isOutgoing: true, durationSeconds: 0 })).toBe(
      callStatusText('FAILED'),
    );
  });
});

describe('startCallSchema', () => {
  it('tur ko’rsatilmasa ovozli qo’ng’iroq bo’ladi', () => {
    const parsed = startCallSchema.parse({ conversationId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301' });

    expect(parsed.kind).toBe('AUDIO');
  });

  it('noto’g’ri suhbat ID rad etiladi', () => {
    expect(startCallSchema.safeParse({ conversationId: 'salom' }).success).toBe(false);
  });
});

describe('callSignalSchema', () => {
  it('taklif matnsiz qabul qilinmaydi', () => {
    expect(callSignalSchema.safeParse({ type: 'offer' }).success).toBe(false);
  });

  it('manzil obyekti bilan qabul qilinadi', () => {
    expect(callSignalSchema.safeParse({ type: 'candidate', candidate: { candidate: 'a=1' } }).success).toBe(true);
  });

  it('manzilsiz "candidate" rad etiladi', () => {
    expect(callSignalSchema.safeParse({ type: 'candidate' }).success).toBe(false);
  });

  it('juda uzun taklif rad etiladi', () => {
    // Navbat xotirada turadi — cheklovsiz unga istalgancha ma'lumot tiqib bo'lardi.
    expect(callSignalSchema.safeParse({ type: 'offer', sdp: 'x'.repeat(20_001) }).success).toBe(false);
  });
});

describe('endCallSchema', () => {
  it('sabab ko’rsatilmasa oddiy tugatish', () => {
    expect(endCallSchema.parse({}).failed).toBe(false);
  });
});

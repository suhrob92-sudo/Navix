import { describe, expect, it } from 'vitest';

import { AuditAction } from '@/lib/audit';
import {
  AUDIT_ACTION_LABELS,
  AUDIT_GROUP_ACTIONS,
  auditActionLabel,
  auditActionTone,
} from '@/modules/admin/audit-actions';

describe('audit amallari katalogi', () => {
  /**
   * Eng muhim tekshiruv: yangi amal qo'shilib, unga o'zbekcha nom
   * yozilmasa, jurnalda `payment.service.refunded` kabi texnik kalit
   * chiqib qolardi. Bu test buni oldini oladi.
   */
  it("kodda ishlatiladigan HAR BIR amalning o'zbekcha nomi bor", () => {
    const missing = Object.values(AuditAction).filter((action) => !(action in AUDIT_ACTION_LABELS));

    expect(missing).toEqual([]);
  });

  it("guruhlardagi amallar ham katalogda bo'lishi kerak", () => {
    const grouped = Object.values(AUDIT_GROUP_ACTIONS).flat();
    const missing = grouped.filter((action) => !(action in AUDIT_ACTION_LABELS));

    expect(missing).toEqual([]);
  });

  it('bir amal ikki guruhga tushmaydi', () => {
    const grouped = Object.values(AUDIT_GROUP_ACTIONS).flat();

    expect(new Set(grouped).size).toBe(grouped.length);
  });
});

describe('auditActionLabel', () => {
  it('tanish amalni tarjima qiladi', () => {
    expect(auditActionLabel('payment.service.refunded')).toBe('Pulni qaytardi');
  });

  /**
   * Jurnal ESKI yozuvlarni ham ko'rsatadi. Kelajakda amal nomi
   * o'zgarsa, eski yozuv baribir bazada qoladi — sahifa bo'sh katak
   * emas, hech bo'lmasa kalitning o'zini ko'rsatishi kerak.
   */
  it("noma'lum amalda kalitning o'zini qaytaradi", () => {
    expect(auditActionLabel('taxi.ride.started')).toBe('taxi.ride.started');
  });
});

describe('auditActionTone', () => {
  it('pul amallari ajratiladi', () => {
    expect(auditActionTone('wallet.transfer')).toBe('money');
    expect(auditActionTone('payment.service.refunded')).toBe('money');
  });

  it('admin amallari ajratiladi', () => {
    expect(auditActionTone('admin.user.status_changed')).toBe('admin');
  });

  it('muvaffaqiyatsiz kirish urinishi — xavf belgisi', () => {
    // Ketma-ket kelgan bunday yozuvlar parolni taxmin qilish
    // urinishini bildiradi, shuning uchun ko'zga tashlanishi kerak.
    expect(auditActionTone('user.login.failed')).toBe('danger');
    expect(auditActionTone('user.login.success')).toBe('neutral');
  });
});

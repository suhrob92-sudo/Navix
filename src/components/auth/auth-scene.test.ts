import { describe, expect, it } from 'vitest';

import { sceneModules } from '@/components/auth/auth-scene';
import { ModuleStatus } from '@/config/modules';

/**
 * Kirish sahifasidagi sahna nimani ko'rsatadi.
 *
 * ── Nima uchun bu sinov bor ───────────────────────────────────────────
 * Sahna bezak emas: u odamga "bu ilova nima qiladi" deb javob beradi.
 * Shuning uchun u yerda faqat ISHLAYOTGAN xizmat turishi kerak.
 *
 * Rejadagi modul chiqib qolsa, bu jimgina va'da bo'lardi: odam
 * ikonkani ko'rib kiradi va o'sha xizmatni topmaydi. Bosh sahifada
 * aynan shunday xato bor edi — "Taksi chaqiring" deb yozilgandi,
 * holbuki taksi hali ishlamaydi.
 */
describe('kirish sahifasidagi sahna', () => {
  const modules = sceneModules();

  it("bo'sh emas", () => {
    expect(modules.length).toBeGreaterThan(3);
  });

  it('faqat ishlayotgan xizmatlar', () => {
    const planned = modules.filter((module) => module.status !== ModuleStatus.LIVE);

    expect(planned.map((module) => module.name), 'Rejadagi modul sahnaga tushib qolgan').toEqual([]);
  });

  it("oltitadan oshmaydi", () => {
    /*
      Sahnada oltita joy bor. Ko'proq modul kelsa, ortiqchasi
      joylashuvsiz qolib, ekranning chap yuqori burchagida
      to'planib qolardi.
    */
    expect(modules.length).toBeLessThanOrEqual(6);
  });

  it('har birining ikonkasi va rangi bor', () => {
    for (const module of modules) {
      expect(module.icon, `${module.name}: ikonka yo'q`).toBeDefined();
      expect(module.color, `${module.name}: rang yo'q`).toBeTruthy();
    }
  });
});

/**
 * "Buyurtmani takrorlash" — qoidalar.
 *
 * ── Nima uchun bu bosqich kerak bo'ldi ────────────────────────────────
 * Odamlar ovqatni ODAT bo'yicha buyurtma qiladi: o'sha restoran,
 * o'sha taom, har hafta. Har safar restoranni izlab, menyuni
 * varaqlab, to'rtta taomni qaytadan tanlash — o'ndan ortiq bosish.
 *
 * ── Nima uchun savat SHUNCHAKI to'ldirilmaydi ─────────────────────────
 * Eski buyurtmadagi taom bugun menyuda bo'lmasligi mumkin: restoran
 * uni o'chirgan, tugab qolgan yoki narxini o'zgartirgan.
 *
 * Savatni "eski buyurtmaning nusxasi" deb to'ldirish odamni
 * aldardi — u kassada boshqa summa yoki kam taom ko'rardi.
 *
 * Shuning uchun avval REJA tuziladi: nima qo'shiladi, nima
 * qo'shilmaydi va nimasi o'zgargan. Odam buni KO'RIB turib
 * tasdiqlaydi.
 */

/** Eski buyurtmadagi qator. */
export interface ReorderSource {
  /** Menyudagi taom. O'chirilgan bo'lsa `null`. */
  menuItemId: string | null;
  name: string;
  quantity: number;
  /** Buyurtma paytidagi narx — TIYINDA. */
  unitPrice: number;
}

/** Bugungi menyudagi taom. */
export interface ReorderMenuItem {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

/** Narxi o'zgargan taom. */
export interface PriceChange {
  name: string;
  /** TIYINDA. */
  oldPrice: number;
  newPrice: number;
}

export interface ReorderPlan {
  /** Savatga tushadigan qatorlar. */
  lines: { menuItemId: string; quantity: number }[];
  /**
   * Qo'shib bo'lmaydigan taomlar nomi.
   *
   * Menyudan o'chirilgan ham, bugun tugagan ham shu ro'yxatga
   * tushadi: xaridor uchun natija bir xil — bu taom bo'lmaydi.
   */
  missing: string[];
  /** Narxi o'zgargan taomlar. */
  priceChanges: PriceChange[];
}

/**
 * Eski buyurtmani bugungi menyu bilan solishtiradi.
 *
 * @param items Eski buyurtmadagi qatorlar.
 * @param menu Bugungi menyudagi barcha taomlar.
 */
export function planReorder(
  items: readonly ReorderSource[],
  menu: readonly ReorderMenuItem[],
): ReorderPlan {
  const byId = new Map(menu.map((item) => [item.id, item]));

  const lines: ReorderPlan['lines'] = [];
  const missing: string[] = [];
  const priceChanges: PriceChange[] = [];

  for (const item of items) {
    const current = item.menuItemId ? byId.get(item.menuItemId) : undefined;

    /*
      Taom o'chirilgan yoki bugun mavjud emas — natija bir xil.
      Nom ESKI buyurtmadan olinadi: o'chirilgan taomning bugungi
      nomi yo'q.
    */
    if (!current || !current.isAvailable) {
      missing.push(item.name);
      continue;
    }

    lines.push({ menuItemId: current.id, quantity: item.quantity });

    if (current.price !== item.unitPrice) {
      priceChanges.push({ name: current.name, oldPrice: item.unitPrice, newPrice: current.price });
    }
  }

  return { lines, missing, priceChanges };
}

/**
 * Rejani odam tiliga o'giradi.
 *
 * ── Nima uchun ogohlantirish MATNI shu yerda ──────────────────────────
 * Bir xil matn tugmada ham, tasdiqlash oynasida ham kerak. Uni
 * ikki joyda yozish ikkisi vaqt o'tib bir-biridan farq qilishiga
 * olib borardi.
 *
 * @returns Ogohlantirishlar ro'yxati. Hammasi joyida bo'lsa — bo'sh.
 */
export function describeReorder(plan: ReorderPlan): string[] {
  const notes: string[] = [];

  if (plan.missing.length > 0) {
    notes.push(
      plan.missing.length === 1
        ? `"${plan.missing[0]}" bugun mavjud emas — u savatga qo'shilmaydi.`
        : `${plan.missing.length} ta taom bugun mavjud emas: ${plan.missing.join(', ')}.`,
    );
  }

  if (plan.priceChanges.length > 0) {
    notes.push(
      plan.priceChanges.length === 1
        ? `"${plan.priceChanges[0].name}" narxi o'zgargan.`
        : `${plan.priceChanges.length} ta taom narxi o'zgargan.`,
    );
  }

  return notes;
}

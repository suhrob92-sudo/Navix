import { isInsideUzbekistan, TAXI_TARIFFS, type TaxiTariffName } from '@/config/taxi';
import type { Point } from '@/config/delivery-eta';
import { prisma } from '@/lib/prisma';
import { formatTiyin } from '@/lib/money';
import { getWalletSummary } from '@/modules/wallet/wallet.service';
import {
  calculateTaxiFare,
  isTaxiDistanceAllowed,
  routeDistanceKm,
  taxiMinutes,
} from '@/modules/taxi/taxi.pricing';
import type { AssistantLocation, AssistantReply } from '@/modules/assistant/assistant.types';

/**
 * "Navix, uyga taksi" — yordamchining taksi oqimi.
 *
 * ── Nima uchun ALOHIDA fayl ───────────────────────────────────────────
 * `assistant.food-flow.ts` va `assistant.market-flow.ts` bilan bir xil
 * sabab: `assistant.service.ts` allaqachon uzun va har modul o'z
 * qoidalariga ega. Ularni bitta faylga to'plash har o'zgarishda butun
 * yordamchini qayta o'qishga majbur qilardi.
 *
 * ── Bu yerda safar YARATILMAYDI ───────────────────────────────────────
 * Bu — modulning eng muhim qoidasi. Bu fayl faqat TAYYORLAYDI:
 * manzilni topadi, masofani o'lchaydi, narxni hisoblaydi va
 * `confirm_taxi_order` qaytaradi.
 *
 * Haqiqiy buyurtma foydalanuvchi tugmani bosgandan keyin, odatdagi
 * `POST /api/v1/taxi/rides` orqali yaratiladi. Ya'ni narx, masofa,
 * balans va idempotentlik SERVERDA qaytadan tekshiriladi va yordamchi
 * ularni chetlab o'ta olmaydi.
 *
 * Ovoz bilan aytilgan buyruq ham shu yo'ldan yuradi: gapirish bilan
 * pul yechilmaydi.
 */

/** Yordamchi taklif qiladigan standart tarif. */
const DEFAULT_TARIFF: TaxiTariffName = 'ECONOM';

export interface TaxiFlowParams {
  userId: string;
  /** Brauzerdan kelgan joriy joylashuv. Ruxsat berilmagan bo'lsa `null`. */
  location: AssistantLocation | null;
  /** Matndan topilgan manzil turi. `null` — aytilmagan. */
  destination: 'HOME' | 'WORK' | null;
}

interface SavedPlace {
  latitude: number;
  longitude: number;
  line: string;
}

/**
 * Saqlangan manzilni TURI bo'yicha topadi.
 *
 * ── Nima uchun `isDefault` bo'yicha tartiblanadi ──────────────────────
 * Bir odamda ikkita "Uy" bo'lishi mumkin (o'zining va ota-onasiniki).
 * Standart deb belgilangani ustunroq — foydalanuvchi aynan shuni
 * "mening uyim" deb hisoblaydi.
 */
async function findSavedPlace(userId: string, type: 'HOME' | 'WORK'): Promise<SavedPlace | null> {
  const row = await prisma.address.findFirst({
    where: { userId, type, deletedAt: null },
    select: { label: true, city: true, street: true, building: true, latitude: true, longitude: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  if (!row) return null;

  const parts = [row.street, row.building ? `${row.building}-uy` : null].filter(Boolean);

  return {
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    line: parts.length > 0 ? `${row.label}: ${parts.join(', ')}` : `${row.label}: ${row.city}`,
  };
}

/** Javobni bir joydan yasaymiz — takrorlanadigan maydonlar unutilmasin. */
function reply(text: string, suggestions: string[] = []): AssistantReply {
  return { text, suggestions, action: { kind: 'none' }, state: { slots: {} } };
}

export async function handleTaxiOrder(params: TaxiFlowParams): Promise<AssistantReply> {
  const { userId, location, destination } = params;

  /*
    1. QAYERGA — bu birinchi savol.

    Manzil aytilmagan bo'lsa TAXMIN QILINMAYDI. "Uy" deb o'ylab,
    noto'g'ri joyga taksi chaqirish foydalanuvchiga pul ham, vaqt
    ham yo'qotadi.
  */
  if (!destination) {
    return reply('Qayerga boramiz — uyga yoki ishga?', ['Uyga taksi', 'Ishga taksi']);
  }

  const label = destination === 'HOME' ? 'Uy' : 'Ish';
  const place = await findSavedPlace(userId, destination);

  if (!place) {
    return reply(
      `${label} manzilingiz saqlanmagan. Uni bir marta qo'shsangiz, keyingi safar "${label.toLowerCase()}ga taksi" deyishingiz kifoya.`,
      ["Manzil qo'shish"],
    );
  }

  /*
    2. QAYERDAN — joriy joylashuv.

    Bu ma'lumot faqat brauzerda bor. Ruxsat berilmagan bo'lsa,
    yordamchi taksi ekraniga yo'naltiradi: u yerda nuqtani xaritadan
    qo'lda tanlash mumkin.
  */
  if (!location) {
    return reply(
      "Hozir qayerdaligingizni bilmayapman. Joylashuvga ruxsat bering yoki taksi ekranida nuqtani xaritadan tanlang.",
      ['Taksi ekranini ochish'],
    );
  }

  const from: Point = { latitude: location.latitude, longitude: location.longitude };
  const to: Point = { latitude: place.latitude, longitude: place.longitude };

  /*
    Chet eldagi koordinata rad etiladi. Server ham uni qabul
    qilmaydi, lekin sababni SHU YERDA aytish tushunarliroq: aks
    holda foydalanuvchi tasdiq tugmasini bosib, xom xato olardi.
  */
  if (!isInsideUzbekistan(from)) {
    return reply("Joylashuvingiz O'zbekistondan tashqarida ko'rinmoqda — taksi chaqira olmayman.");
  }

  const km = routeDistanceKm(from, to);

  if (km === 0) {
    return reply(`Siz allaqachon ${label.toLowerCase()} manzilingizdasiz.`);
  }

  if (!isTaxiDistanceAllowed(km)) {
    return reply(
      `${label} manzilingizgacha ${km.toFixed(1)} km — bu taksi uchun juda uzoq. Sayohat bo'limidan foydalaning.`,
      ["Sayohat bo'limi"],
    );
  }

  const fare = calculateTaxiFare(DEFAULT_TARIFF, km);
  const amountSom = fare.priceTiyin / 100;

  /*
    3. BALANS — tasdiqdan OLDIN tekshiriladi.

    Server baribir tekshiradi va yetmasa xato qaytaradi. Lekin
    o'shanda foydalanuvchi butun tasdiq oynasini ko'rib, tugmani
    bosib, keyin "pulingiz yetmaydi" degan javobni olardi.

    Oldindan aytish halolroq va bitta ortiqcha bosishni tejaydi.
  */
  const wallet = await getWalletSummary(userId, 1);
  /* `balance` allaqachon TIYINDA va oddiy son — o'girish shart emas. */
  const balanceTiyin = wallet.balance;

  if (balanceTiyin < fare.priceTiyin) {
    return reply(
      `Safar ${formatTiyin(fare.priceTiyin)} turadi, hamyoningizda ${formatTiyin(balanceTiyin)} bor. Avval hisobni to'ldiring.`,
      ["Hisobni to'ldirish"],
    );
  }

  const minutes = taxiMinutes(km);

  return {
    text:
      `${label} manzilingizgacha ${km.toFixed(1)} km, taxminan ${minutes} daqiqa. ` +
      `${TAXI_TARIFFS[DEFAULT_TARIFF].label} tarifida ${formatTiyin(fare.priceTiyin)}. Chaqiraymi?`,
    suggestions: [],
    action: {
      kind: 'confirm_taxi_order',
      tariff: DEFAULT_TARIFF,
      tariffLabel: TAXI_TARIFFS[DEFAULT_TARIFF].label,
      fromLat: from.latitude,
      fromLng: from.longitude,
      /*
        Olish nuqtasining NOMI yo'q: koordinatani ko'cha nomiga
        aylantirish uchun geokodlash xizmati kerak va u hozircha
        yo'q. "Joriy joylashuvingiz" — rost va tushunarli matn.
      */
      fromAddress: 'Joriy joylashuvingiz',
      toLat: to.latitude,
      toLng: to.longitude,
      toAddress: place.line,
      distanceKm: km,
      minutes,
      amountSom,
    },
    state: { slots: {} },
  };
}

import {
  isInsideUzbekistan,
  TAXI_SEARCH_RADIUS_KM,
  TAXI_TARIFFS,
  type TaxiTariffName,
} from '@/config/taxi';
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
  /** "Eng arzon" yoki "eng tez". `null` — aytilmagan. */
  preference?: 'CHEAPEST' | 'FASTEST' | null;
  /** Ataylab aytilgan tarif nomi. `null` — aytilmagan. */
  requestedTariff?: 'ECONOM' | 'COMFORT' | 'BUSINESS' | null;
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

/** Tanlangan tarif va uning SABABI — matnda tushuntirish uchun. */
interface TariffChoice {
  tariff: TaxiTariffName;
  /** Ekranda ko'rsatiladigan qo'shimcha izoh. Bo'sh bo'lishi mumkin. */
  note: string;
}

/**
 * Eng ARZON tarifni topadi.
 *
 * ── Nima uchun ro'yxatdan birinchisi olinmaydi ────────────────────────
 * "Ekonom har doim arzon" deb yozib qo'yish oson, lekin u narxlar
 * o'zgarganda jimgina yolg'onga aylanardi. Bu yerda esa HAQIQIY
 * narxlar solishtiriladi — masofa hisobga olingan holda.
 */
function cheapestTariff(km: number): TaxiTariffName {
  const names = Object.keys(TAXI_TARIFFS) as TaxiTariffName[];

  return names.reduce((best, name) =>
    calculateTaxiFare(name, km).priceTiyin < calculateTaxiFare(best, km).priceTiyin ? name : best,
  );
}

/**
 * Yaqin atrofda qaysi tarifda nechta mashina onlayn.
 *
 * ── Nima uchun "eng tez" AYNAN shu bilan o'lchanadi ───────────────────
 * Ikkala tarifdagi mashina ham bir xil ko'chada, bir xil tezlikda
 * yuradi — tarif mashinaning tezligini o'zgartirmaydi.
 *
 * Haqiqiy farq KUTISHDA: yaqin atrofda qaysi tarifda ko'proq mashina
 * bo'lsa, o'shanisi tezroq keladi. Bu — o'ylab topilgan emas, bazadan
 * o'qilgan haqiqat.
 *
 * ── Nima uchun masofa DASTURDA hisoblanmaydi ──────────────────────────
 * Bu yerda faqat SON kerak, tartib emas. Radius o'rniga oddiy
 * to'rtburchak chegara ishlatiladi: u indeksdan foydalanadi va
 * bir necha kilometrlik xato bu qarorda ahamiyatsiz.
 */
async function onlineDriverCounts(here: Point): Promise<Record<TaxiTariffName, number>> {
  /* Taxminan qidiruv radiusiga teng to'rtburchak — 1 daraja ≈ 111 km. */
  const span = TAXI_SEARCH_RADIUS_KM / 111;

  const rows = await prisma.taxiDriver.groupBy({
    by: ['tariff'],
    where: {
      isOnline: true,
      deletedAt: null,
      lastLat: { gte: here.latitude - span, lte: here.latitude + span },
      lastLng: { gte: here.longitude - span, lte: here.longitude + span },
    },
    _count: { _all: true },
  });

  /*
    Boshlang'ich nollar REYESTRDAN yasaladi.

    Ilgari bu yerda `{ ECONOM: 0, COMFORT: 0 }` qo'lda yozilgandi.
    Uchinchi tarif qo'shilganda uning soni `undefined` bo'lib
    qolardi va solishtirish jimgina noto'g'ri ishlardi —
    TypeScript esa `as` tufayli buni ushlay olmasdi.
  */
  const counts = Object.fromEntries(
    (Object.keys(TAXI_TARIFFS) as TaxiTariffName[]).map((name) => [name, 0]),
  ) as Record<TaxiTariffName, number>;

  for (const row of rows) {
    counts[row.tariff as TaxiTariffName] = row._count._all;
  }

  return counts;
}

/**
 * Qaysi tarifda chaqiramiz.
 *
 * ── Tartib MUHIM ──────────────────────────────────────────────────────
 * 1. ATAYLAB aytilgan nom ("komfort chaqir") — eng aniq xohish;
 * 2. maqsad ("eng arzon", "eng tez");
 * 3. standart.
 *
 * "Eng arzon komfort" degan gapda ikkalasi ham bor. Bunday holatda
 * NOM ustun: odam mashina turini tanlagan, arzonlik esa uning ichida
 * qidiriladi. Teskarisi bo'lsa, aytilgan mashina turi e'tiborsiz
 * qolardi.
 */
async function chooseTariff(
  km: number,
  here: Point,
  preference: 'CHEAPEST' | 'FASTEST' | null,
  requested: 'ECONOM' | 'COMFORT' | 'BUSINESS' | null,
): Promise<TariffChoice> {
  /*
    Ataylab aytilgan tarif — eng aniq xohish.

    Tekshiruv REYESTR bo'yicha: yangi tarif qo'shilganda bu yer
    o'zi ishlayveradi. Ilgari bu yerda nomlar qo'lda sanalgandi va
    Biznes tarifi qo'shilganda u "mavjud emas" deb qolgandi.
  */
  if (requested && requested in TAXI_TARIFFS) {
    return { tariff: requested as TaxiTariffName, note: '' };
  }

  if (preference === 'CHEAPEST') {
    return { tariff: cheapestTariff(km), note: 'Eng arzon tarifni tanladim.' };
  }

  if (preference === 'FASTEST') {
    const counts = await onlineDriverCounts(here);
    const names = Object.keys(TAXI_TARIFFS) as TaxiTariffName[];

    const best = names.reduce((left, right) => (counts[right] > counts[left] ? right : left));

    /*
      Hech qayerda mashina bo'lmasa, tanlashning ma'nosi yo'q va
      buni AYTAMIZ: aks holda odam "eng tez" so'rab, uzoq kutib
      o'tirardi va sababini bilmasdi.
    */
    if (counts[best] === 0) {
      return {
        tariff: cheapestTariff(km),
        note: "Hozir yaqin atrofda onlayn mashina ko'rinmadi — kutish uzayishi mumkin.",
      };
    }

    return {
      tariff: best,
      note: `Yaqin atrofda ${TAXI_TARIFFS[best].label} tarifida ${counts[best]} ta mashina bor — tezroq keladi.`,
    };
  }

  return { tariff: DEFAULT_TARIFF, note: '' };
}

/** Javobni bir joydan yasaymiz — takrorlanadigan maydonlar unutilmasin. */
function reply(text: string, suggestions: string[] = []): AssistantReply {
  return { text, suggestions, action: { kind: 'none' }, state: { slots: {} } };
}

export async function handleTaxiOrder(params: TaxiFlowParams): Promise<AssistantReply> {
  const { userId, location, destination, preference = null, requestedTariff = null } = params;

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

  const choice = await chooseTariff(km, from, preference, requestedTariff);
  const fare = calculateTaxiFare(choice.tariff, km);
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

  /* Sabab bo'lsa, u ASOSIY matndan oldin turadi: odam avval "nima uchun
     bu tarif?" degan savolga javob oladi, keyin narxni ko'radi. */
  const explanation = choice.note ? `${choice.note} ` : '';

  return {
    text:
      `${explanation}${label} manzilingizgacha ${km.toFixed(1)} km, taxminan ${minutes} daqiqa. ` +
      `${TAXI_TARIFFS[choice.tariff].label} tarifida ${formatTiyin(fare.priceTiyin)}. Chaqiraymi?`,
    suggestions: [],
    action: {
      kind: 'confirm_taxi_order',
      tariff: choice.tariff,
      tariffLabel: TAXI_TARIFFS[choice.tariff].label,
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

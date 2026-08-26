/**
 * Xarita — kafel (tile) hisobi.
 *
 * ── Nima uchun tayyor kutubxona emas ──────────────────────────────────
 * Leaflet yoki Mapbox kabi kutubxonalar kuchli: surish, kattalashtirish,
 * marshrut chizish. Lekin ular ilovaga yuzlab kilobayt qo'shadi va
 * o'z CSS faylini talab qiladi.
 *
 * Bizga esa buyurtma sahifasida ATIGI SHU kerak: ikki nuqta (kuryer va
 * manzil) bitta rasmda ko'rinsin. Buni surish ham, kattalashtirish ham
 * shart emas — aksincha, harakatdagi odam xaritani tasodifan surib
 * yuborsa, u kuryerni qaytadan izlashi kerak bo'lardi.
 *
 * Shuning uchun bu yerda faqat MATEMATIKA turadi: koordinatani ekran
 * nuqtasiga aylantirish. Uni test qilish oson va u brauzerga bog'liq
 * emas.
 *
 * ── Nima uchun "Web Mercator" ─────────────────────────────────────────
 * Bu dunyodagi deyarli barcha xarita xizmatlari ishlatadigan
 * proyeksiya. Uning kafellari 256x256 piksel va manzili bir xil
 * tuzilishga ega: `{z}/{x}/{y}.png`.
 *
 * Ya'ni bu hisob OpenStreetMap bilan ham, ertaga boshqa xizmatga
 * o'tilsa ham ishlaydi — faqat manzil shabloni o'zgaradi.
 */

import type { Point } from '@/config/delivery-eta';

/** Bitta kafelning o'lchami — PIKSELDA. Bu standart, o'zgarmaydi. */
export const TILE_SIZE = 256;

/**
 * Eng kichik va eng katta yaqinlashtirish darajasi.
 *
 * ── Nima uchun 17 dan oshmaydi ────────────────────────────────────────
 * 18-19 darajada alohida uylar ko'rinadi. Kuryerning joylashuvi esa
 * GPS orqali keladi va uning xatosi shahar sharoitida 10-30 metr.
 *
 * Ya'ni juda yaqin xarita YOLG'ON aniqlik berardi: kuryer qo'shni
 * hovlida turgandek ko'rinishi mumkin.
 */
export const MIN_ZOOM = 3;
export const MAX_ZOOM = 17;

/**
 * Nuqtalar chetga tegib turmasligi uchun bo'sh joy — PIKSELDA.
 *
 * Belgining o'zi ham joy egallaydi: markeri chetda qolsa, uning
 * yarmi kesilib ko'rinardi.
 */
export const MAP_PADDING = 48;

/** Ekrandagi nuqta — PIKSELDA, xaritaning chap-yuqori burchagidan. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * Koordinatani "dunyo pikseli" ga aylantiradi.
 *
 * Bu darajadagi butun dunyo bitta katta rasm deb qaraladi: uning
 * kengligi `256 * 2^zoom` piksel. Shu tizimda ikki nuqta orasidagi
 * masofani oddiy ayirish bilan topsa bo'ladi.
 */
export function worldPoint(point: Point, zoom: number): ScreenPoint {
  const scale = TILE_SIZE * 2 ** zoom;

  const x = ((point.longitude + 180) / 360) * scale;

  /*
    Kenglik uchun formula murakkabroq: Mercator proyeksiyasida
    qutublarga yaqinlashgan sari masofa cho'ziladi.

    Kenglik ±85.05° bilan CHEGARALANADI — undan narida formula
    cheksizlikka ketadi (qutublar bu xaritada umuman yo'q).
  */
  const lat = Math.max(-85.05112878, Math.min(85.05112878, point.latitude));
  const rad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * scale;

  return { x, y };
}

/**
 * Barcha nuqtalar SIG'ADIGAN eng katta daraja.
 *
 * ── Nima uchun eng KATTA ──────────────────────────────────────────────
 * Daraja qancha katta bo'lsa, xarita shuncha batafsil. Kuryer manzilga
 * yaqin bo'lsa, ko'chalar nomi ko'rinadigan darajada yaqinlashtirish
 * kerak; uzoq bo'lsa esa ikkalasi ham sig'ishi muhimroq.
 */
export function fitZoom(points: readonly Point[], width: number, height: number): number {
  if (points.length === 0) return MIN_ZOOM;
  if (points.length === 1) return MAX_ZOOM - 2;

  const usableWidth = Math.max(1, width - MAP_PADDING * 2);
  const usableHeight = Math.max(1, height - MAP_PADDING * 2);

  for (let zoom = MAX_ZOOM; zoom > MIN_ZOOM; zoom -= 1) {
    const projected = points.map((point) => worldPoint(point, zoom));

    const spanX = Math.max(...projected.map((p) => p.x)) - Math.min(...projected.map((p) => p.x));
    const spanY = Math.max(...projected.map((p) => p.y)) - Math.min(...projected.map((p) => p.y));

    if (spanX <= usableWidth && spanY <= usableHeight) return zoom;
  }

  return MIN_ZOOM;
}

/** Nuqtalarning o'rtasi — xarita markazi. */
export function centerOf(points: readonly Point[]): Point | null {
  if (points.length === 0) return null;

  const latitude = (Math.max(...points.map((p) => p.latitude)) + Math.min(...points.map((p) => p.latitude))) / 2;
  const longitude = (Math.max(...points.map((p) => p.longitude)) + Math.min(...points.map((p) => p.longitude))) / 2;

  return { latitude, longitude };
}

/**
 * Koordinata xaritaning QAYSI nuqtasida turishini hisoblaydi.
 *
 * Natija — chap-yuqori burchakdan piksel. Belgini shu joyga qo'yish
 * kifoya.
 */
export function toScreen(
  point: Point,
  center: Point,
  zoom: number,
  width: number,
  height: number,
): ScreenPoint {
  const target = worldPoint(point, zoom);
  const middle = worldPoint(center, zoom);

  return {
    x: width / 2 + (target.x - middle.x),
    y: height / 2 + (target.y - middle.y),
  };
}

/** Xaritani qoplaydigan bitta kafel. */
export interface MapTile {
  /** Kafel manzilidagi raqamlar. */
  x: number;
  y: number;
  zoom: number;
  /** Kafel ekranning qaysi joyiga qo'yiladi — PIKSELDA. */
  left: number;
  top: number;
}

/**
 * Xaritani to'liq qoplash uchun kerakli kafellar ro'yxati.
 *
 * ── Nima uchun chetdan bitta ortiqcha ─────────────────────────────────
 * Markaz kafelning aynan o'rtasiga tushmaydi. Shuning uchun har
 * tomondan bitta qo'shimcha kafel olinadi — aks holda chetlarda
 * bo'sh oq chiziq qolardi.
 */
export function tileGrid(center: Point, zoom: number, width: number, height: number): MapTile[] {
  const middle = worldPoint(center, zoom);
  const count = 2 ** zoom;

  /* Ekranning chap-yuqori burchagi dunyo piksellarida qayerda. */
  const originX = middle.x - width / 2;
  const originY = middle.y - height / 2;

  const firstX = Math.floor(originX / TILE_SIZE);
  const firstY = Math.floor(originY / TILE_SIZE);
  const lastX = Math.floor((originX + width) / TILE_SIZE);
  const lastY = Math.floor((originY + height) / TILE_SIZE);

  const tiles: MapTile[] = [];

  for (let y = firstY; y <= lastY; y += 1) {
    /*
      Vertikal bo'yicha o'ralish YO'Q: xaritaning tepasi va tagi
      chegara. Chegaradan tashqaridagi kafel umuman mavjud emas.
    */
    if (y < 0 || y >= count) continue;

    for (let x = firstX; x <= lastX; x += 1) {
      /*
        Gorizontal bo'yicha esa dunyo YUMALOQ: 180-meridiandan
        o'tilganda kafellar boshidan davom etadi.
      */
      const wrapped = ((x % count) + count) % count;

      tiles.push({
        x: wrapped,
        y,
        zoom,
        left: x * TILE_SIZE - originX,
        top: y * TILE_SIZE - originY,
      });
    }
  }

  return tiles;
}

/**
 * Belgilar bir-birini yopmasligi uchun ENG KAM masofa — PIKSELDA.
 *
 * Narx yorlig'i taxminan 70 piksel keng. Ikkita belgi markazi
 * shundan yaqin bo'lsa, ular ustma-ust tushadi va pastdagisini
 * o'qib ham, bosib ham bo'lmaydi.
 */
export const MIN_MARKER_DISTANCE = 72;

/** Bir joyga to'plangan belgilar guruhi. */
export interface MarkerCluster<T> {
  /** Guruhdagi yozuvlar — birinchisi "vakil" bo'ladi. */
  items: T[];
  /** Guruh markazi — ekrandagi o'rni. */
  screen: ScreenPoint;
}

/**
 * Yaqin turgan belgilarni GURUHLAYDI.
 *
 * ── Nima uchun kerak bo'ldi ───────────────────────────────────────────
 * Butun O'zbekiston ko'rinib turganda Samarqand bilan Buxoro
 * ekranda 40 piksel masofada bo'ladi. Ikkala narx yorlig'i
 * ustma-ust tushadi: pastdagisini o'qib bo'lmaydi va uni bosish
 * ham deyarli imkonsiz.
 *
 * Bu 49-bosqichda ataylab qoldirilgan edi — shahar tanlanganda
 * muammo yo'q. Lekin "barcha shaharlar" ko'rinishi eng birinchi
 * ochiladigan ko'rinish, ya'ni odam muammoni BIRINCHI ko'radi.
 *
 * ── Nima uchun oddiy usul ─────────────────────────────────────────────
 * Xarita kutubxonalarida murakkab guruhlash algoritmlari bor
 * (to'r bo'yicha, daraxt bo'yicha). Ular minglab nuqta uchun
 * kerak.
 *
 * Bizda esa bir ekranda ko'pi bilan o'nlab mehmonxona bo'ladi.
 * Bunday holatda eng sodda usul — ketma-ket yurib, yaqinini
 * qo'shib borish — ham tez, ham natijasi oldindan aytiladigan.
 *
 * ── Nima uchun tartib MUHIM ───────────────────────────────────────────
 * Guruhning "vakili" — birinchi kelgan yozuv. Ya'ni ro'yxat
 * tartibi o'zgarsa, ekrandagi narx ham o'zgaradi. Chaqiruvchi
 * ro'yxatni barqaror tartibda berishi kerak.
 */
export function clusterMarkers<T>(
  items: readonly T[],
  screenOf: (item: T) => ScreenPoint,
  minDistance: number = MIN_MARKER_DISTANCE,
): MarkerCluster<T>[] {
  const clusters: MarkerCluster<T>[] = [];

  for (const item of items) {
    const screen = screenOf(item);

    const near = clusters.find((cluster) => {
      const dx = cluster.screen.x - screen.x;
      const dy = cluster.screen.y - screen.y;

      return Math.sqrt(dx * dx + dy * dy) < minDistance;
    });

    if (near) {
      near.items.push(item);
      continue;
    }

    /*
      Guruh markazi BIRINCHI yozuvning o'rnida qoladi va keyin
      o'zgarmaydi.

      O'rtacha qiymatga ko'chirish "to'g'riroq" tuyuladi, lekin
      o'shanda guruh markazi har qo'shilishda siljib, uzoqdagi
      belgi bilan qayta yaqinlashib qolishi mumkin edi — natija
      qo'shilish tartibiga bog'liq bo'lardi.
    */
    clusters.push({ items: [item], screen });
  }

  return clusters;
}

/**
 * Kafel manzili.
 *
 * ── Nima uchun OpenStreetMap ──────────────────────────────────────────
 * U bepul va kalit talab qilmaydi — ya'ni bugun ishlaydi.
 *
 * MUHIM: OSM ning bepul serverlari OG'IR yuklamaga mo'ljallanmagan.
 * Foydalanuvchilar ko'payganda o'z tile serverimizga yoki pullik
 * xizmatga o'tish kerak — o'shanda FAQAT SHU FUNKSIYA o'zgaradi.
 */
export function tileUrl(tile: MapTile): string {
  return `https://tile.openstreetmap.org/${tile.zoom}/${tile.x}/${tile.y}.png`;
}

/**
 * Xarita ostidagi majburiy yozuv.
 *
 * OpenStreetMap litsenziyasi buni TALAB qiladi. Uni olib tashlash
 * litsenziyani buzish demak.
 */
export const MAP_ATTRIBUTION = '© OpenStreetMap';

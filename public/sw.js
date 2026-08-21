/**
 * Navix'ning "xizmat ishchisi" (service worker).
 *
 * ── Bu nima ───────────────────────────────────────────────────────────
 * Bu — brauzer ichida, sahifadan ALOHIDA ishlaydigan kichik dastur.
 * Uning bitta xususiyati bor: ilova yopiq bo'lganda ham ishga tushadi.
 *
 * Aynan shu sababli push xabarni faqat u ko'rsata oladi.
 *
 * ── U ikkita ish qiladi ───────────────────────────────────────────────
 *   1. Push xabarni ko'rsatadi (pastda).
 *   2. Ilovaning O'ZINI (kod, uslub, shrift) keshlaydi — shuning
 *      uchun u tez ochiladi va internet yo'qligida ham ishga tushadi.
 *
 * ── ENG MUHIM QOIDA: MA'LUMOT KESHLANMAYDI ────────────────────────────
 * Bu qaror ilovaning boshidan beri amal qiladi va u ATAYLAB
 * qilingan:
 *
 *     Noto'g'ri kesh eng yomon xatolarni keltirib chiqaradi — odam
 *     eski NARXNI yoki eski BALANSNI ko'rib qolishi mumkin.
 *
 * Shuning uchun keshga faqat QARIMAYDIGAN narsalar tushadi:
 *
 *   ✅ JavaScript, CSS, shrift — fayl nomida versiya bor
 *      (`chunks/2-3f1p4geboky.js`). Kod o'zgarsa nom ham o'zgaradi,
 *      ya'ni eski nusxa yangisini ALMASHTIRA OLMAYDI.
 *   ✅ Rasm va belgilar — eskirsa zarari yo'q.
 *   ✅ "Internet yo'q" sahifasi — u o'zgarmaydi.
 *
 *   ❌ API javoblari — narx, balans, xabar, buyurtma holati.
 *   ❌ HTML sahifalar — ular ichida foydalanuvchi ma'lumoti bo'ladi.
 *      Umumiy keshda saqlansa, bitta telefonni ikki kishi
 *      ishlatganda birinchisining ma'lumoti ikkinchisiga ko'rinardi.
 *
 * ── Sonlar `src/config/pwa.ts` bilan bir xil ──────────────────────────
 * Bu fayl oddiy JavaScript va u sozlamadan `import` qila olmaydi.
 * Shuning uchun qiymatlar shu yerda takrorlangan. Ular bir-biriga
 * mos ekanini `pwa.test.ts` tekshiradi — ya'ni biri o'zgarib,
 * ikkinchisi eskirib qolishi mumkin emas.
 */

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `navix-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `navix-assets-${CACHE_VERSION}`;
const OFFLINE_PATH = '/offline';
const MAX_CACHED_IMAGES = 60;

/** Kesh-first qo'llaniladigan turlar. */
const CACHEABLE_DESTINATIONS = ['script', 'style', 'font'];

/**
 * Yangi versiya DARHOL ishga tushadi.
 *
 * Usiz brauzer eski nusxani barcha oynalar yopilgunicha saqlab turardi
 * va tuzatilgan xato telefonda kunlab qolib ketardi.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);

      /*
        Oflayn sahifa O'RNATISH paytida yoziladi.

        Keyinroq yozsak, internet birinchi marta uzilganda u hali
        keshda bo'lmasdi — ya'ni aynan kerak bo'lgan paytda
        ishlamasdi.

        Xato YUTILADI: bitta fayl yuklanmagani uchun butun xizmat
        ishchisini o'rnatmaslik noto'g'ri bo'lardi — push xabar ham
        ishlamay qolardi.
      */
      await cache.addAll([OFFLINE_PATH, '/icon-192.png']).catch(() => undefined);
    })(),
  );

  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      /*
        ESKI versiyadagi keshlar o'chiriladi.

        Kesh nomida versiya bor. Qoida o'zgarganda versiya oshadi va
        eski nomdagi hamma narsa shu yerda tozalanadi — ya'ni
        tozalashni qo'lda qilish kerak emas.
      */
      const names = await caches.keys();

      await Promise.all(
        names
          .filter((name) => name.startsWith('navix-') && name !== SHELL_CACHE && name !== ASSET_CACHE)
          .map((name) => caches.delete(name)),
      );

      await self.clients.claim();
    })(),
  );
});

/**
 * Keshdagi rasmlar sonini cheklaydi.
 *
 * Rasmlar keshning katta qismini egallaydi. Cheklanmasa, telefon
 * xotirasi to'lib, brauzer BUTUN keshni o'chirib tashlardi — ya'ni
 * ilova kodi ham yo'qolardi va oflayn ishlash buzilardi.
 *
 * Eng eski yozuvlar birinchi bo'lib o'chiriladi (`keys()` yozilish
 * tartibini saqlaydi).
 */
async function trimImageCache(cache) {
  const keys = await cache.keys();

  if (keys.length <= MAX_CACHED_IMAGES) return;

  await Promise.all(keys.slice(0, keys.length - MAX_CACHED_IMAGES).map((key) => cache.delete(key)));
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  /*
    Faqat O'QISH so'rovlari.

    `POST`, `PATCH`, `DELETE` — bular ma'lumotni o'zgartiradi va
    ularni keshlash mumkin emas.
  */
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Begona domen (masalan Vercel Blob) — brauzerning o'zi hal qiladi.
  if (url.origin !== self.location.origin) return;

  /*
    API — HECH QACHON keshlanmaydi.

    Bu yerdagi javoblarda narx, balans va shaxsiy xabarlar bor.
    Ularning eskisi foydali emas, ZARARLI.
  */
  if (url.pathname.startsWith('/api/')) return;

  /*
    Sahifaga o'tish: avval INTERNET, bo'lmasa "internet yo'q" sahifasi.

    Sahifaning O'ZI keshga yozilmaydi — izohi yuqorida.
  */
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const offline = await cache.match(OFFLINE_PATH);

          /*
            Oflayn sahifa ham topilmasa, brauzerning o'z xatosini
            qaytaramiz — bu yerda yasama javob berish faqat
            chalkashtirardi.
          */
          return offline ?? Response.error();
        }
      })(),
    );

    return;
  }

  const isAsset = CACHEABLE_DESTINATIONS.includes(request.destination);
  const isImage = request.destination === 'image';

  if (!isAsset && !isImage) return;

  /*
    Kod va rasm: avval KESH, bo'lmasa internet.

    Bu tur uchun kesh xavfsiz, chunki fayl nomida versiya bor:
    kod o'zgarsa nom ham o'zgaradi va eski nusxa hech qachon
    yangisining o'rniga chiqmaydi.
  */
  event.respondWith(
    (async () => {
      const cacheName = isImage ? ASSET_CACHE : SHELL_CACHE;
      const cache = await caches.open(cacheName);
      const hit = await cache.match(request);

      if (hit) return hit;

      const response = await fetch(request);

      /*
        Faqat MUVAFFAQIYATLI javob keshlanadi.

        404 yoki 500 ni keshlasak, vaqtinchalik xato abadiy
        bo'lib qolardi.
      */
      if (response.ok) {
        await cache.put(request, response.clone());

        if (isImage) await trimImageCache(cache);
      }

      return response;
    })(),
  );
});

/** Serverdan push kelganda. */
self.addEventListener('push', (event) => {
  /**
   * Ma'lumot buzilgan bo'lsa ham xabar KO'RSATILADI.
   *
   * Brauzer qoidasi qat'iy: push kelgan bo'lsa, bildirishnoma
   * chiqishi shart. Aks holda brauzer "yashirin push" deb hisoblab,
   * keyingi safar ruxsatni umuman olib qo'yishi mumkin.
   */
  let payload = { title: 'Navix', body: 'Yangi xabar', url: '/', tag: 'navix' };

  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // Buzilgan ma'lumot — yuqoridagi standart matn ishlatiladi.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      /**
       * Bir xil `tag` li xabar oldingisini ALMASHTIRADI.
       *
       * Bitta suhbatdan o'nta xabar kelsa, ekranda o'nta bildirishnoma
       * emas, faqat oxirgisi turadi.
       */
      tag: payload.tag,
      // Manzil bosilganda kerak bo'ladi.
      data: { url: payload.url },
      /**
       * Telefon tebranadi.
       *
       * Ovoz o'chirilgan bo'lsa ham odam qo'ng'iroqni sezishi kerak.
       */
      vibrate: [200, 100, 200],
    }),
  );
});

/** Bildirishnoma bosilganda. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const target = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      /**
       * Ilova ALLAQACHON ochiq bo'lsa, yangi oyna ochilmaydi.
       *
       * Aks holda har bosilgan xabarda yangi varaq ochilib, telefonda
       * o'nlab bir xil oyna to'planib qolardi.
       */
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus();

          // Kerakli sahifaga o'tkazamiz.
          if ('navigate' in client) {
            try {
              await client.navigate(target);
            } catch {
              // Boshqa domenga o'tib bo'lmaydi — ochiq oyna shundayligicha qoladi.
            }
          }

          return;
        }
      }

      await self.clients.openWindow(target);
    })(),
  );
});

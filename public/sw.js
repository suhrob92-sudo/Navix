/**
 * Navix'ning "xizmat ishchisi" (service worker).
 *
 * ── Bu nima ───────────────────────────────────────────────────────────
 * Bu — brauzer ichida, sahifadan ALOHIDA ishlaydigan kichik dastur.
 * Uning bitta xususiyati bor: ilova yopiq bo'lganda ham ishga tushadi.
 *
 * Aynan shu sababli push xabarni faqat u ko'rsata oladi.
 *
 * ── Nima uchun bu yerda kesh YO'Q ─────────────────────────────────────
 * Xizmat ishchisi odatda sahifalarni keshlab, ilovani internetsiz
 * ishlatish uchun ham qo'llanadi. Navix'da bu ATAYLAB qilinmagan:
 * noto'g'ri kesh eng yomon xatolarni keltirib chiqaradi — odam eski
 * narxni yoki eski balansni ko'rib qolishi mumkin.
 *
 * Shuning uchun bu fayl faqat bitta ish qiladi: xabarni ko'rsatadi.
 */

/**
 * Yangi versiya DARHOL ishga tushadi.
 *
 * Usiz brauzer eski nusxani barcha oynalar yopilgunicha saqlab turardi
 * va tuzatilgan xato telefonda kunlab qolib ketardi.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
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

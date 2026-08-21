/**
 * Barmoq uchun eng kichik nishon — YAGONA standart.
 *
 * ── Nima uchun 44 piksel ──────────────────────────────────────────────
 * Apple ham (Human Interface Guidelines), Google ham (Material Design)
 * shu sonni beradi. Sabab fiziologik: odamning barmoq uchi ekranda
 * taxminan 8-10 mm joyni egallaydi va barmoq ostidagi nuqtani odam
 * KO'RMAYDI — u faqat taxmin qiladi.
 *
 * ── Muammo NIMADA edi (o'lchangan) ────────────────────────────────────
 * Lenta sahifasida 123 ta nishon shu chegaradan kichik chiqdi.
 * Ularning ko'pi — eng ko'p bosiladigan tugmalar:
 *
 *     Yoqtirish, Izohlar, Ulashish   40×28 px
 *     Post amallari                  32×32 px
 *     Orqaga                         40×40 px
 *     Tezlik                         33×28 px
 *
 * 28 piksel — bu chegaraning uchdan ikkisi. Bunday tugma birinchi
 * urinishda ko'pincha tegmaydi va odam ikkinchi marta bosadi. Video
 * ustida esa noto'g'ri tegish videoni to'xtatib qo'yadi.
 *
 * ── Nima uchun tugmalarni KATTALASHTIRMAYMIZ ──────────────────────────
 * Yechim "hamma tugmani 44px qilish" emas edi. Lentadagi belgilar
 * ATAYLAB kichik: ular mazmunni (post matni, rasm, video) ustidan
 * bosib ketmasligi kerak. Instagram va TikTok ham aynan shunday
 * kichik belgilar chizadi.
 *
 * Yechim boshqacha: BOSILADIGAN joy ko'rinadigan joydan katta
 * bo'ladi. Belgi 20px bo'lib qolaveradi, atrofidagi ko'rinmas
 * maydon esa 44px gacha kengayadi (`.tap-target` sinfi
 * `globals.css` da).
 *
 * ── Nima uchun bu son SOZLAMADA ───────────────────────────────────────
 * U ikki joyda kerak: CSS yordamchi sinfida va sinovda. Ikkalasida
 * qo'lda yozilsa, biri o'zgarganda ikkinchisi eskirib qolardi va
 * sinov noto'g'ri narsani tekshirardi.
 */
export const MIN_TOUCH_SIZE = 44;

/**
 * Tekshiruvdan CHETLASHTIRILADIGAN holatlar.
 *
 * ── Nima uchun ro'yxat kerak ──────────────────────────────────────────
 * Matn ichidagi havola (foydalanuvchi nomi, mavzu, "Ko'proq") tugma
 * emas — u gapning bir qismi. Uni 44px qilish matnni buzardi:
 * qatorlar orasi ochilib ketardi.
 *
 * Bunday havolalar yonida har doim katta nishon bor (avatar, butun
 * kartochka), shuning uchun ular yagona yo'l emas.
 */
export const TOUCH_EXEMPT_REASON = 'matn ichidagi havola';

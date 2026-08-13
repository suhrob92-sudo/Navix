import { FileText } from 'lucide-react';

import { LEGAL_ENTITY } from '@/config/legal/company';
import { siteConfig } from '@/config/site';
import { MAX_TOP_UP_SOM, MAX_TRANSFER_SOM, MIN_TOP_UP_SOM, formatTiyin, somToTiyin } from '@/lib/money';
import type { LegalDocument } from '@/config/legal/legal.types';

/**
 * Foydalanish shartlari.
 *
 * ── Nima uchun summalar QO'LDA yozilmagan ─────────────────────────────
 * Hamyon chegaralari kodda belgilangan (`MIN_TOP_UP_SOM` va h.k.).
 * Agar hujjatga "10 000 000 so'm" deb qo'lda yozilsa, chegara
 * o'zgargan kuni hujjat yolg'on gapira boshlardi — va bu shunchaki
 * xato emas, shartnoma buzilishi bo'lardi.
 *
 * Shuning uchun matn shu qiymatlardan YASALADI: chegara o'zgarsa,
 * hujjat ham o'zi o'zgaradi.
 */
const money = (som: number): string => formatTiyin(somToTiyin(som));

export const TERMS_OF_USE: LegalDocument = {
  slug: 'shartlar',
  title: 'Foydalanish shartlari',
  summary: "Ilovadan foydalanish qoidalari: hisob, taqiqlar, hamyon, javobgarlik va nizolarni hal qilish.",
  icon: FileText,
  updatedAt: '2026-08-13',
  sections: [
    {
      id: 'atamalar',
      title: '1. Asosiy atamalar',
      blocks: [
        {
          kind: 'list',
          items: [
            `«Ilova» — ${siteConfig.name} mobil ilovasi va ${siteConfig.url} sayti.`,
            "«Foydalanuvchi» — ilovada ro'yxatdan o'tgan shaxs.",
            "«Sotuvchi» — ilovada tovar yoki xizmat taklif qiluvchi do'kon, restoran, mehmonxona, tashuvchi.",
            "«Kuryer» — buyurtmani yetkazib beruvchi shaxs.",
            "«Hamyon» — ilova ichidagi shaxsiy hisob: to'ldiriladi va to'lovlar undan yechiladi.",
          ],
        },
      ],
    },
    {
      id: 'ilova-roli',
      title: "2. Ilovaning roli",
      blocks: [
        {
          kind: 'text',
          value:
            "Ilova — bu MAYDON: u foydalanuvchi bilan sotuvchini bog'laydi, buyurtmani yetkazadi va to'lovni o'tkazadi.",
        },
        {
          kind: 'note',
          value:
            "Tovar yoki xizmatni SOTUVCHI sotadi. Uning sifati, tarkibi, kafolati va qonuniyligi uchun sotuvchi javob beradi. Ilova esa buyurtma to'g'ri o'tishi, pul to'g'ri hisoblanishi va nizoda yordam berish uchun javob beradi.",
        },
      ],
    },
    {
      id: 'hisob',
      title: "3. Hisob va ro'yxatdan o'tish",
      blocks: [
        {
          kind: 'list',
          items: [
            "Ro'yxatdan o'tish uchun O'zbekiston operatorining telefon raqami kerak — u SMS kod bilan tasdiqlanadi.",
            "Bitta telefon raqamiga bitta hisob ochiladi.",
            "Kiritilgan ma'lumot haqiqiy bo'lishi shart. Boshqa odamning nomidan yoki soxta ma'lumot bilan hisob ochish taqiqlanadi.",
            "Hisobingizdagi barcha harakatlar uchun siz javob berasiz — parolni saqlash ham sizning zimmangizda.",
            "Parolingiz boshqaga ma'lum bo'lganini sezsangiz, uni darhol almashtiring va «Xavfsizlik» bo'limidan boshqa qurilmalarni chiqarib yuboring.",
          ],
        },
      ],
    },
    {
      id: 'taqiqlar',
      title: '4. Taqiqlangan harakatlar',
      blocks: [
        {
          kind: 'text',
          value: 'Ilovada quyidagilar taqiqlanadi:',
        },
        {
          kind: 'list',
          items: [
            "Qonun bilan taqiqlangan tovar va xizmatlarni sotish yoki sotib olishga urinish (giyohvand moddalar, qurol, soxta hujjat, o'g'irlangan mol va shunga o'xshashlar)",
            "Aldash: bo'lmagan tovarni sotish, boshqa odamning kartasi yoki hisobidan foydalanish",
            "Boshqa foydalanuvchini haqorat qilish, tahdid qilish, ta'qib qilish",
            "Spam, reklama tarqatish va so'ralmagan ommaviy xabar yuborish",
            "Xizmat ishiga xalaqit berish: yuklama yaratish, himoyani chetlab o'tishga urinish, kodni buzishga urinish",
            "Ma'lumotlarni avtomatik yig'ish (parsing, scraping) va ularni boshqa xizmatda ishlatish",
            "Boshqa odamning rasmini yoki nomini o'zinikidek ko'rsatish",
          ],
        },
        {
          kind: 'note',
          value:
            "Qoida buzilganda hisob vaqtincha to'xtatiladi yoki butunlay yopiladi. Jiddiy holatlarda ma'lumot huquqni muhofaza qiluvchi organlarga beriladi.",
        },
      ],
    },
    {
      id: 'kontent',
      title: '5. Siz joylagan kontent',
      blocks: [
        {
          kind: 'text',
          value:
            "Ijtimoiy bo'limga joylagan post, izoh, rasm va xabaringiz uchun siz javob berasiz. Kontentni joylash orqali siz uni ilova ichida ko'rsatishga ruxsat berasiz — mulk huquqi sizda qoladi.",
        },
        {
          kind: 'text',
          value:
            "Qoidalarga zid kontent shikoyat asosida yoki tekshiruv natijasida o'chiriladi. Qaroringiz noto'g'ri deb hisoblasangiz, qo'llab-quvvatlash xizmatiga murojaat qiling.",
        },
      ],
    },
    {
      id: 'hamyon',
      title: '6. Hamyon va toʻlovlar',
      blocks: [
        {
          kind: 'table',
          head: ['Shart', 'Qiymat'],
          rows: [
            ["Eng kam to'ldirish", money(MIN_TOP_UP_SOM)],
            ["Bir martada eng ko'p to'ldirish", money(MAX_TOP_UP_SOM)],
            ["Bir martada eng ko'p o'tkazma", money(MAX_TRANSFER_SOM)],
          ],
        },
        {
          kind: 'list',
          items: [
            "Hamyon — bu bank hisobi emas va unga foiz hisoblanmaydi.",
            "Buyurtma bekor qilinganda pul hamyonga qaytadi.",
            "Boshqa foydalanuvchiga o'tkazma bekor qilinmaydi — qabul qiluvchini yuborishdan OLDIN tekshiring.",
            "Hamyondagi mablag' faqat ilova ichidagi xizmatlar uchun ishlatiladi.",
          ],
        },
        {
          kind: 'note',
          value:
            "Har bir amal hamyon tarixida yoziladi. Noto'g'ri yozuvni ko'rsangiz, 30 kun ichida murojaat qiling.",
        },
      ],
    },
    {
      id: 'sotuvchi-kuryer',
      title: '7. Sotuvchi va kuryer uchun qoʻshimcha shartlar',
      blocks: [
        {
          kind: 'text',
          value:
            "Sotuvchi va kuryer roli hujjat tekshirilgandan keyin beriladi. Bu rollar uchun quyidagilar qo'shimcha talab qilinadi:",
        },
        {
          kind: 'list',
          items: [
            "Taklif qilinayotgan tovar va uning narxi haqiqiy bo'lishi shart",
            "Qabul qilingan buyurtmani belgilangan muddatda bajarish",
            "Mijozning manzili va telefon raqamini faqat shu buyurtma uchun ishlatish, boshqa hech kimga bermaslik",
            "Buyurtmani bajara olmaslik aniqlanganda uni darhol rad etish — mijozni kutdirmaslik",
          ],
        },
        {
          kind: 'note',
          value:
            "Mijozning shaxsiy ma'lumotini boshqa maqsadda ishlatish — rolni bekor qilishga va javobgarlikka olib keladi.",
        },
      ],
    },
    {
      id: 'javobgarlik',
      title: '8. Javobgarlik chegaralari',
      blocks: [
        {
          kind: 'list',
          items: [
            "Ilova sotuvchi taklif qilgan tovarning sifati va tarkibi uchun javob bermaydi.",
            "Ilova o'z aybi bilan yetkazilgan zarar uchun javob beradi — masalan, pul noto'g'ri hisoblansa.",
            "Internet uzilishi, operator nosozligi, tabiiy ofat va shunga o'xshash biz nazorat qila olmaydigan holatlar uchun javobgarlik yuklanmaydi.",
            "Xizmat texnik ish tufayli vaqtincha to'xtatilishi mumkin — imkon qadar oldindan xabar beriladi.",
          ],
        },
      ],
    },
    {
      id: 'toxtatish',
      title: "9. Hisobni to'xtatish va yopish",
      blocks: [
        {
          kind: 'text',
          value:
            "Hisobingizni istalgan vaqtda «Profil → Xavfsizlik» bo'limidan yopishingiz mumkin. Tugallanmagan buyurtma yoki hamyonda mablag' bo'lsa, avval ular hal qilinishi kerak.",
        },
        {
          kind: 'text',
          value:
            "Biz esa qoida buzilgan holatda hisobni to'xtatishimiz mumkin. Bunday holatda sizga sabab bilan xabar beriladi va hamyondagi mablag'ingiz saqlanadi.",
        },
      ],
    },
    {
      id: 'nizolar',
      title: '10. Nizolarni hal qilish',
      blocks: [
        {
          kind: 'text',
          value: `Avval qo'llab-quvvatlash xizmatiga murojaat qiling: ${LEGAL_ENTITY.email}. Murojaatlar ${LEGAL_ENTITY.supportHours} vaqtida ko'rib chiqiladi.`,
        },
        {
          kind: 'text',
          value: `Kelishuvga erishilmasa, nizo ${LEGAL_ENTITY.country} qonunchiligi asosida sud tartibida hal qilinadi.`,
        },
      ],
    },
    {
      id: 'ozgarishlar',
      title: "11. Shartlarga o'zgartirish kiritish",
      blocks: [
        {
          kind: 'text',
          value:
            "Shartlar o'zgarishi mumkin. Muhim o'zgarish kuchga kirishidan oldin ilovada xabar beriladi. O'zgarishdan keyin foydalanishni davom ettirish — yangi shartlarga rozilik bildirish demakdir.",
        },
      ],
    },
  ],
};

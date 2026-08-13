import { Scale } from 'lucide-react';

import { LEGAL_ENTITY } from '@/config/legal/company';
import { siteConfig } from '@/config/site';
import { TRIP_RULES } from '@/config/travel';
import type { LegalDocument } from '@/config/legal/legal.types';

/**
 * Ommaviy oferta — xaridor bilan tuziladigan shartnoma.
 *
 * ── Nima uchun bu hujjat ALOHIDA ─────────────────────────────────────
 * «Foydalanish shartlari» ilovadan qanday foydalanishni yozadi.
 * Oferta esa PUL haqida: nimani sotib olayotganingiz, qachon pul
 * qaytishi va kim nima uchun javob berishi. Click va Payme kabi
 * to'lov tashkilotlari aynan shu hujjatni so'raydi.
 *
 * ── Nima uchun bekor qilish shartlari kod bilan MOS ───────────────────
 * Bu yerdagi har bir qoida ilovada haqiqatan bajariladigan qoida.
 * Chipta qaytarish foizi esa `TRIP_RULES` dan olinadi — sozlama
 * o'zgarsa, hujjat ham o'zgaradi.
 */
export const PUBLIC_OFFER: LegalDocument = {
  slug: 'oferta',
  title: 'Ommaviy oferta',
  summary: "Xarid shartnomasi: buyurtma, to'lov, bekor qilish, pul qaytarish va tomonlarning javobgarligi.",
  icon: Scale,
  updatedAt: '2026-08-13',
  requiresRequisites: true,
  sections: [
    {
      id: 'oferta',
      title: '1. Oferta va uni qabul qilish',
      blocks: [
        {
          kind: 'text',
          value: `Ushbu hujjat — ${siteConfig.name} ilovasi orqali tovar va xizmatlar sotib olish bo'yicha ommaviy oferta, ya'ni barcha uchun ochiq shartnoma taklifi.`,
        },
        {
          kind: 'text',
          value:
            "Buyurtma berish va uni to'lash — offertani QABUL QILISH hisoblanadi. Shu paytdan boshlab ushbu hujjat tomonlar o'rtasidagi shartnoma kuchiga ega bo'ladi.",
        },
        {
          kind: 'note',
          value:
            "Buyurtma berishdan oldin ushbu hujjatni o'qib chiqing. Rozi bo'lmasangiz, buyurtma bermang.",
        },
      ],
    },
    {
      id: 'predmet',
      title: '2. Shartnoma predmeti',
      blocks: [
        {
          kind: 'text',
          value:
            "Ilova xaridor bilan sotuvchini bog'laydi, buyurtmani rasmiylashtiradi, to'lovni o'tkazadi va yetkazishni tashkil qiladi.",
        },
        {
          kind: 'text',
          value:
            "Tovarni sotish shartnomasi XARIDOR bilan SOTUVCHI o'rtasida tuziladi. Ilova bu shartnomada vositachi hisoblanadi.",
        },
      ],
    },
    {
      id: 'buyurtma',
      title: '3. Buyurtma berish tartibi',
      blocks: [
        {
          kind: 'list',
          items: [
            "Xaridor tovarni tanlaydi, yetkazish manzilini ko'rsatadi va buyurtmani tasdiqlaydi.",
            "Buyurtma tasdiqlangan paytda uning summasi hamyondan yechiladi.",
            "Sotuvchi buyurtmani qabul qiladi yoki asos ko'rsatib rad etadi.",
            "Buyurtma holati ilovada ko'rsatiladi va har bir o'zgarishda xabar yuboriladi.",
            "Yetkazilgani KURYER tomonidan tasdiqlanadi — sotuvchi buni o'zi belgilay olmaydi.",
          ],
        },
      ],
    },
    {
      id: 'narx',
      title: "4. Narx va to'lov",
      blocks: [
        {
          kind: 'list',
          items: [
            "Barcha narxlar O'zbekiston so'mida ko'rsatiladi.",
            "Yakuniy summa buyurtmani tasdiqlashdan oldin, yetkazish haqi bilan birga ko'rsatiladi.",
            "To'lov ilova hamyoni orqali amalga oshiriladi. Hamyon bank kartasi orqali to'ldiriladi.",
            "Buyurtma tasdiqlangandan keyin uning narxi o'zgarmaydi.",
          ],
        },
      ],
    },
    {
      id: 'yetkazish',
      title: '5. Yetkazib berish',
      blocks: [
        {
          kind: 'list',
          items: [
            "Yetkazish manzili buyurtma berishda ko'rsatiladi va keyin o'zgartirilmaydi.",
            "Kuryer topshiriqni olganda uning ismi va telefon raqami ilovada ko'rinadi.",
            "Xaridor ko'rsatilgan manzilda va telefon aloqasida bo'lishi kerak.",
            "Xaridor topilmasa yoki aloqaga chiqmasa, buyurtma qaytariladi — bunday holatda yetkazish haqi qaytarilmaydi.",
          ],
        },
      ],
    },
    {
      id: 'bekor-qilish',
      title: '6. Bekor qilish va pul qaytarish',
      blocks: [
        {
          kind: 'text',
          value: 'Bekor qilish imkoniyati buyurtma qaysi bosqichda ekaniga bogʻliq:',
        },
        {
          kind: 'table',
          head: ['Xizmat', 'Qachongacha bekor qilish mumkin', 'Qancha qaytadi'],
          rows: [
            ['Ovqat yetkazish', "Restoran tayyorlashni boshlagunga qadar", "To'liq"],
            ["Marketplace", "Buyurtma yo'lga chiqarilgunga qadar", "To'liq"],
            ['Mehmonxona', 'Kirish kunidan oldingi kunga qadar', "To'liq"],
            [
              'Chipta',
              `Jo'nashgacha ${TRIP_RULES.fullRefundHours} soatdan ko'p vaqt qolganda`,
              "To'liq",
            ],
            [
              'Chipta (kech bekor qilish)',
              "Jo'nashgacha qolgan vaqt kamayganda",
              `${TRIP_RULES.lateRefundPercent}%`,
            ],
            ['Posilka', "Kuryer olib chiqqunga qadar", "To'liq"],
          ],
        },
        {
          kind: 'text',
          value:
            "Sotuvchi buyurtmani rad etsa, summa har doim TO'LIQ qaytariladi — bosqichdan qat'i nazar.",
        },
        {
          kind: 'note',
          value:
            "Pul ilova hamyoniga qaytariladi va darhol ishlatish mumkin. Hamyondan bank kartasiga chiqarish tartibi alohida e'lon qilinadi.",
        },
      ],
    },
    {
      id: 'sifat',
      title: '7. Tovar sifati va daʼvolar',
      blocks: [
        {
          kind: 'list',
          items: [
            "Tovarni qabul qilishda uni kuryer oldida ko'zdan kechiring.",
            "Tovar buzuq, kam yoki tavsifga mos bo'lmasa — buyurtmani qabul qilmang va darhol qo'llab-quvvatlashga yozing.",
            "Da'vo buyurtma yetkazilgan kundan boshlab 24 soat ichida bildirilishi kerak.",
            "Da'vo ko'rib chiqilib, asosli bo'lsa, summa qaytariladi yoki tovar almashtiriladi.",
          ],
        },
        {
          kind: 'note',
          value:
            "Tez buziladigan mahsulot (tayyor ovqat) yetkazilgandan keyin qaytarib olinmaydi — bundan sifatsizlik holati mustasno.",
        },
      ],
    },
    {
      id: 'majburiyatlar',
      title: '8. Tomonlarning majburiyatlari',
      blocks: [
        {
          kind: 'text',
          value: 'Ilova quyidagilarni oʻz zimmasiga oladi:',
        },
        {
          kind: 'list',
          items: [
            "Buyurtmani sotuvchiga yetkazish va holatini kuzatib borish",
            "To'lovni to'g'ri hisoblash va bekor qilinganda pulni qaytarish",
            "Xaridorning ma'lumotini maxfiy saqlash",
            "Nizoda tomonlar o'rtasida vositachilik qilish",
          ],
        },
        {
          kind: 'text',
          value: 'Xaridor quyidagilarni oʻz zimmasiga oladi:',
        },
        {
          kind: 'list',
          items: [
            "To'g'ri manzil va telefon raqamini ko'rsatish",
            "Buyurtmani qabul qilish uchun aloqada bo'lish",
            "Ilovadan qonun doirasida foydalanish",
          ],
        },
      ],
    },
    {
      id: 'javobgarlik',
      title: '9. Javobgarlik',
      blocks: [
        {
          kind: 'list',
          items: [
            "Tovarning sifati, tarkibi va kafolati uchun sotuvchi javob beradi.",
            "To'lov va buyurtma jarayonidagi texnik xatolar uchun ilova javob beradi.",
            "Xaridor noto'g'ri manzil ko'rsatgani sababli yuzaga kelgan zarar uchun ilova javob bermaydi.",
            "Fors-major holatlarida (tabiiy ofat, elektr yoki internet uzilishi, davlat qarorlari) tomonlar javobgarlikdan ozod qilinadi.",
          ],
        },
      ],
    },
    {
      id: 'amal-muddati',
      title: '10. Shartnomaning amal qilish muddati',
      blocks: [
        {
          kind: 'text',
          value:
            "Shartnoma buyurtma tasdiqlangan paytdan boshlanadi va tomonlar o'z majburiyatlarini to'liq bajarganda tugaydi.",
        },
        {
          kind: 'text',
          value: `Ushbu offertaga taalluqli barcha munosabatlar ${LEGAL_ENTITY.country} qonunchiligi bilan tartibga solinadi.`,
        },
      ],
    },
    {
      id: 'rekvizitlar',
      title: '11. Rekvizitlar',
      blocks: [
        {
          kind: 'text',
          value: "Tashkilotning rasmiy ma'lumotlari quyida keltirilgan.",
        },
      ],
    },
  ],
};

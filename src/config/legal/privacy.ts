import { ShieldCheck } from 'lucide-react';

import { LEGAL_ENTITY } from '@/config/legal/company';
import { siteConfig } from '@/config/site';
import type { LegalDocument } from '@/config/legal/legal.types';

/**
 * Maxfiylik siyosati.
 *
 * ── Nima uchun matn shunchalik ANIQ ───────────────────────────────────
 * Ko'p ilovalarda bu hujjat "biz ma'lumotlaringizni himoya qilamiz"
 * degan umumiy gaplardan iborat bo'ladi. Bunday matn hech kimga
 * foyda bermaydi va tekshiruvda ham savol tug'diradi.
 *
 * Bu yerda aynan QAYSI ma'lumot, QAYSI SABAB bilan olinishi va u
 * QAYERDA saqlanishi yozilgan. Har bir gap ilovaning haqiqiy
 * ishlashiga mos: yozilmagan narsa yig'ilmaydi, yig'ilgan narsa
 * esa yashirilmaydi.
 */
export const PRIVACY_POLICY: LegalDocument = {
  slug: 'maxfiylik',
  title: 'Maxfiylik siyosati',
  summary: "Qanday ma'lumot olinadi, nima uchun kerak, qayerda saqlanadi va uni qanday o'chirasiz.",
  icon: ShieldCheck,
  updatedAt: '2026-08-13',
  sections: [
    {
      id: 'umumiy',
      title: '1. Umumiy qoidalar',
      blocks: [
        {
          kind: 'text',
          value: `Ushbu siyosat ${siteConfig.name} ilovasi va ${siteConfig.url} saytidan foydalanganda shaxsga doid ma'lumotlar qanday yig'ilishi, ishlatilishi va saqlanishini tushuntiradi.`,
        },
        {
          kind: 'text',
          value:
            "Ma'lumotlar O'zbekiston Respublikasining «Shaxsga doid ma'lumotlar to'g'risida»gi Qonuni talablari asosida qayta ishlanadi.",
        },
        {
          kind: 'text',
          value:
            "Ilovadan foydalanishni boshlash — bu siyosatni o'qib chiqqaningizni va unga rozilik bildirganingizni bildiradi. Rozi bo'lmasangiz, ilovadan foydalanmang.",
        },
      ],
    },
    {
      id: 'qanday-malumot',
      title: "2. Qanday ma'lumot olinadi",
      blocks: [
        {
          kind: 'text',
          value: "Ma'lumot uch yo'l bilan to'planadi: siz o'zingiz kiritasiz, ilova ishlatilganda hosil bo'ladi yoki qurilmangiz yuboradi.",
        },
        {
          kind: 'table',
          head: ["Ma'lumot", 'Nima uchun kerak'],
          rows: [
            ['Telefon raqami', "Hisobga kirish va tasdiqlash — usiz ro'yxatdan o'tib bo'lmaydi"],
            ['Ism va familiya', "Buyurtmada sotuvchi va kuryerga kim ekaningizni bildirish"],
            ['Parol', "Faqat qaytarib bo'lmaydigan shaklda (hash) saqlanadi — hech kim, biz ham, uni o'qiy olmaymiz"],
            ['Profil rasmi, tavsif, foydalanuvchi nomi', "Ijtimoiy bo'lim — bularni siz o'zingiz kiritasiz va istalgan vaqtda o'chirasiz"],
            ['Yetkazish manzili', "Buyurtmani yetkazish — kuryerga faqat faol buyurtma davomida ko'rinadi"],
            ['Buyurtmalar tarixi', "Buyurtma holatini kuzatish va nizolarni hal qilish"],
            ["To'lov amallari", "Hamyon balansini hisoblash va buxgalteriya talablari"],
            ['Yozishmalar', "Xabar almashish — xabarni siz va suhbatdoshingiz ko'radi"],
            ['Qurilma va brauzer haqida', "Sessiyani boshqarish: qaysi qurilmalar kirganini ko'rsatish va shubhali kirishni to'xtatish"],
            ["IP manzil va so'rov jurnallari", "Xavfsizlik: hujum va suiiste'molni aniqlash"],
            ['Push obuna kaliti', "Bildirishnoma yuborish — faqat siz ruxsat bergan bo'lsangiz"],
          ],
        },
        {
          kind: 'note',
          value:
            "Joylashuvingiz FONDA kuzatilmaydi. Manzil qo'shayotganda xaritadan nuqta tanlasangizgina koordinata saqlanadi.",
        },
      ],
    },
    {
      id: 'nima-uchun',
      title: "3. Ma'lumot nima uchun ishlatiladi",
      blocks: [
        {
          kind: 'list',
          items: [
            "Buyurtmani qabul qilish, yetkazish va pulini hisoblash",
            "Hisobingizni himoya qilish: kirishni tasdiqlash, shubhali harakatni to'xtatish",
            "Buyurtma holati haqida xabar berish (SMS, push, ilova ichidagi bildirishnoma)",
            "Qo'llab-quvvatlash xizmatiga murojaat qilganingizda savolingizni hal qilish",
            "Nizo chiqqanda kim nima qilganini aniqlash uchun amallar jurnalini yuritish",
            "Xizmatdagi xatolarni topish va ishlashini yaxshilash",
          ],
        },
        {
          kind: 'note',
          value:
            "Ma'lumotlaringiz reklama uchun uchinchi shaxslarga SOTILMAYDI va reklama tarmoqlariga berilmaydi.",
        },
      ],
    },
    {
      id: 'kimga-beriladi',
      title: "4. Ma'lumot kimga beriladi",
      blocks: [
        {
          kind: 'text',
          value: "Ma'lumot faqat xizmat ishlashi uchun zarur bo'lgan hajmda va faqat quyidagilarga beriladi:",
        },
        {
          kind: 'table',
          head: ['Kim', 'Nima ko\'radi'],
          rows: [
            ["Sotuvchi yoki restoran", "Buyurtma tarkibi, ismingiz, telefon raqamingiz va manzilingiz"],
            ['Kuryer', "Faol topshiriq davomida: ismingiz, telefon raqamingiz va manzilingiz. Topshiriq yakunlangach ro'yxatdan chiqadi"],
            ["To'lov tashkiloti", "To'lovni amalga oshirish uchun zarur summa va amal raqami"],
            ['SMS operatori', "Tasdiqlash kodi yuborish uchun telefon raqamingiz"],
            ['Davlat organlari', "Faqat qonunda belgilangan tartibda va rasmiy so'rov asosida"],
          ],
        },
        {
          kind: 'text',
          value:
            "Boshqa foydalanuvchilar sizning telefon raqamingizni va manzilingizni KO'RMAYDI. Ijtimoiy bo'limda faqat o'zingiz ochiq qilgan ma'lumot ko'rinadi.",
        },
      ],
    },
    {
      id: 'qayerda-saqlanadi',
      title: "5. Ma'lumot qayerda va qancha saqlanadi",
      blocks: [
        {
          kind: 'text',
          value:
            "Ma'lumotlar himoyalangan bulutli serverlarda, shifrlangan ulanish (HTTPS) orqali saqlanadi. Serverlarning joylashuvi va ma'lumotlarni saqlash sharoitlari haqidagi eng aniq axborotni quyidagi manzilga yozib olishingiz mumkin.",
        },
        {
          kind: 'table',
          head: ["Ma'lumot turi", 'Saqlash muddati'],
          rows: [
            ['Hisob va profil', "Hisobingiz ochiq turgan vaqt davomida"],
            ["To'lov va buyurtma yozuvlari", "Hisob yopilgandan keyin ham — buxgalteriya va soliq talablari bo'yicha"],
            ['Tasdiqlash kodi (OTP)', "Bir necha daqiqa. Kod ochiq holda emas, hash ko'rinishida saqlanadi va uni qayta o'qib bo'lmaydi"],
            ['Sessiya va qurilma yozuvlari', "Sessiya bekor qilinguncha yoki muddati tugaguncha"],
            ['Yozishmalar', "Suhbat o'chirilgunga qadar"],
            ['Amallar jurnali (audit)', "O'zgartirib bo'lmaydigan yozuv — nizolarni hal qilish uchun saqlanadi"],
          ],
        },
      ],
    },
    {
      id: 'xavfsizlik',
      title: '6. Xavfsizlik choralari',
      blocks: [
        {
          kind: 'list',
          items: [
            "Parol qaytarib bo'lmaydigan algoritm bilan saqlanadi — bazaga kirgan odam ham parolni bila olmaydi",
            "Barcha ulanishlar shifrlanadi (HTTPS)",
            "Tasdiqlash kodlari faqat hash ko'rinishida saqlanadi va bir necha daqiqadan keyin o'chadi",
            "Har bir kirish alohida sessiya sifatida yoziladi — ularni «Xavfsizlik» bo'limidan ko'rish va bekor qilish mumkin",
            "Sessiya bekor qilinganda u DARHOL ishlamay qoladi",
            "Muhim amallar (pul, holat o'zgarishi, rol berish) o'zgartirib bo'lmaydigan jurnalga yoziladi",
            "Xodimlar ma'lumotga faqat o'z vazifasi doirasida kira oladi",
          ],
        },
        {
          kind: 'note',
          value:
            "Parolingizni va tasdiqlash kodini HECH KIMGA aytmang. Bizning xodimlarimiz hech qachon parol yoki kod so'ramaydi.",
        },
      ],
    },
    {
      id: 'huquqlaringiz',
      title: '7. Sizning huquqlaringiz',
      blocks: [
        {
          kind: 'list',
          items: [
            "Qaysi ma'lumot saqlanayotganini bilish",
            "Noto'g'ri ma'lumotni tuzatish — profil sozlamalari orqali",
            "Roziligingizni qaytarib olish (masalan, bildirishnomalarni o'chirish)",
            "Hisobingizni butunlay yopish",
            "Shikoyat bilan murojaat qilish",
          ],
        },
        {
          kind: 'text',
          value:
            "Hisobni yopish «Profil → Xavfsizlik» bo'limidagi «Hisobni o'chirish» tugmasi orqali bajariladi. Yopilganda ismingiz, rasmingiz, manzillaringiz va bildirishnoma obunalaringiz o'chiriladi, foydalanuvchi nomingiz va telefon raqamingiz esa boshqa hech kimga bog'lanmaydigan holatga keltiriladi.",
        },
        {
          kind: 'note',
          value:
            "To'lov yozuvlari o'chirilmaydi — ular qonun bo'yicha saqlanishi shart. Lekin ular endi sizning shaxsingizga bog'lanmaydi.",
        },
      ],
    },
    {
      id: 'bolalar',
      title: '8. Yosh chegarasi',
      blocks: [
        {
          kind: 'text',
          value:
            "Xizmat 18 yoshga to'lgan shaxslar uchun mo'ljallangan. 18 yoshga to'lmagan shaxs ilovadan qonuniy vakilining roziligi bilan foydalanishi mumkin.",
        },
        {
          kind: 'text',
          value:
            "Voyaga yetmagan shaxsning ma'lumoti roziliksiz yig'ilgani aniqlansa, u o'chiriladi. Bunday holat haqida bizga xabar bering.",
        },
      ],
    },
    {
      id: 'cookie',
      title: '9. Cookie fayllari',
      blocks: [
        {
          kind: 'text',
          value:
            "Sayt faqat ISHLASH uchun zarur cookie fayllardan foydalanadi: ular sizni kirgan holatda ushlab turadi va tanlangan mavzuni (yorug'/qorong'i) eslab qoladi.",
        },
        {
          kind: 'text',
          value: "Reklama yoki tashqi kuzatuv cookie fayllari ishlatilmaydi.",
        },
      ],
    },
    {
      id: 'ozgarishlar',
      title: "10. Siyosatga o'zgartirish kiritish",
      blocks: [
        {
          kind: 'text',
          value:
            "Siyosat o'zgarishi mumkin. Muhim o'zgarish bo'lsa, ilovada yoki telefon raqamingizga xabar beramiz. Sahifaning yuqorisida oxirgi tahrir sanasi ko'rsatiladi.",
        },
      ],
    },
    {
      id: 'aloqa',
      title: '11. Bog\'lanish',
      blocks: [
        {
          kind: 'text',
          value: `Ma'lumotlaringiz bo'yicha savolingiz bo'lsa: ${LEGAL_ENTITY.email}`,
        },
        {
          kind: 'text',
          value: `Javob berish vaqti: ${LEGAL_ENTITY.supportHours}`,
        },
      ],
    },
  ],
};

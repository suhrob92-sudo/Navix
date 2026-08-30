# Navixni Claude'ga qanday tanishtirish kerak

Claude bilan YANGI suhbat boshlaganingizda u loyihangiz haqida hech
narsa bilmaydi: kodni ko'rmaydi, oldingi suhbatlarni eslamaydi.

Shuning uchun har safar "Navix — bu..." deb boshidan yozish o'rniga
shu fayldan tayyor matnni nusxalab qo'ying.

**Ishlatish:** kerakli bo'limni nusxalang, oxiriga savolingizni
qo'shing va yuboring.

---

## 1. QISQA tanishtiruv

Kichik savollar uchun: bitta xato, bitta funksiya, bitta maslahat.

```
Men Navix ustida ishlayapman — O'zbekiston uchun super ilova.
Bitta ilovada: ovqat yetkazish, marketplace, to'lovlar va hamyon,
ish qidirish, mehmonxona, sayohat, xabarlar va AI yordamchi.

Texnologiyalar: Next.js 16 (App Router), React 19, TypeScript,
Prisma 7 + PostgreSQL, Redis, Tailwind CSS 4, Zod, Vitest.

Men telefondan ishlayman (Termux + GitHub Codespaces).
Javoblarni O'ZBEK tilida yozing.

Savolim:
```

---

## 2. TO'LIQ tanishtiruv

Jiddiy ish uchun: yangi bo'lim, arxitektura, xavfsizlik, katta
o'zgarish.

```
# Loyiha: Navix

O'zbekiston uchun super ilova. Bitta hisob bilan bir nechta xizmat.

## Hozirgi holat (o'lchangan, taxmin emas)

- 14 ta ishlaydigan modul: ovqat yetkazish, marketplace, sotuvchi
  kabineti, hamyon, to'lovlar, ish qidirish, mehmonxona, sayohat,
  yetkazib berish, kuryer, xabarlar, buyurtmalar, AI yordamchi,
  admin panel;
- 4 ta rejadagi modul: taksi, biznes kabinet, xaritalar, moliya
  markazi;
- 230 ta API yo'li, 89 ta baza modeli, 81 ta migratsiya;
- 2868 ta avtomatik sinov (148 fayl), hammasi o'tadi;
- ~161 000 qator kod (TypeScript).

## Texnologiyalar

- Next.js 16.3 (App Router, Turbopack), React 19.2, TypeScript 5
- Prisma 7.9 + PostgreSQL 16, Redis (ioredis)
- Tailwind CSS 4, Zod 4, Vitest 4, JWT (jose), bcrypt
- Vercel (hosting), Neon (baza), Upstash (Redis)

## Loyihaning qat'iy qoidalari

1. Butun interfeys O'ZBEK tilida. Kod izohlari ham o'zbekcha.
2. Pul BUTUN sonda, tiyinda saqlanadi (BigInt). Kasr ishlatilmaydi.
3. Har bir balans o'zgarishi tranzaksiya yozuvi bilan BIRGA bo'ladi.
4. Takroriy so'rov idempotentlik kaliti bilan to'xtatiladi.
5. AI yordamchi LLM ishlatmaydi — u qoidalarga asoslangan.
6. Ruxsatlar rol asosida (RBAC), jiddiy amallar audit jurnaliga
   tushadi va jurnal faqat o'qish uchun.
7. Yozuvlar o'chirilmaydi, "o'chirilgan" deb belgilanadi (soft delete).
8. Egalik SO'ROV ichida tekshiriladi: `where: { id, userId }`.

## Men qanday ishlayman

Telefondan: Termux + GitHub Codespaces. Kod `/workspaces/Navix` da.
Shuning uchun buyruqlar bitta qatorda, nusxa olishga tayyor bo'lsin.

## Javob talablari

- O'ZBEK tilida yozing.
- Murakkab narsani oddiy tushuntiring.
- Placeholder kod yozmang — ishlaydigan kod bering.
- Agar men noto'g'ri yo'l tanlayotgan bo'lsam, to'xtating va
  sababini ayting.

## Savolim
```

---

## 3. Savolni qanday berish kerak

Claude javobining sifati savol sifatiga bog'liq. Yaxshi savolda
to'rtta narsa bo'ladi:

| Nima | Namuna |
|---|---|
| **Maqsad** | "Xaridor buyurtmani bekor qilganda pul qaytishi kerak" |
| **Hozir nima bo'lyapti** | "Pul qaytmayapti, xato ham chiqmayapti" |
| **Xato matni** | Terminaldan yoki ekrandan — TO'LIQ nusxalang |
| **Qaysi fayl** | `src/modules/market/market.service.ts` |

Faqat "ishlamayapti" deb yozsangiz, Claude taxmin qilishga majbur
bo'ladi va ko'pincha noto'g'ri taxmin qiladi.

### Fayl mazmunini qanday yuborish

Telefondan butun faylni nusxalash qiyin. Kerakli qismni oling:

```bash
sed -n '100,160p' src/modules/market/market.service.ts
```

Yoki faylning tuzilishini ko'rsating:

```bash
grep -n "^export" src/modules/market/market.service.ts
```

### Ekran suratini yuborish

Dizayn va interfeys masalalarida surat matndan ko'ra foydaliroq.
Suratni to'g'ridan-to'g'ri suhbatga tashlang.

---

## 4. NIMA YUBORMASLIK kerak

Bular suhbatga tushsa, ular ochiq deb hisoblanadi va ALMASHTIRISH
kerak bo'ladi:

- `.env` va `.env.production` fayllarining mazmuni;
- baza paroli va ulanish manzili (`DATABASE_URL`);
- Redis tokeni, JWT kalitlari, Blob tokeni;
- SMS provayder kaliti, to'lov tizimi kalitlari;
- foydalanuvchilarning telefon raqami va shaxsiy ma'lumotlari.

**Xato matnini yuborish mumkin** — lekin undagi parolni yoki
tokenni `***` bilan almashtiring.

Terminal suratini olayotganda ekranda kalit turmaganiga ishonch
hosil qiling.

---

## 5. Tayyor namunalar

### Xatoni tuzatish

```
[QISQA tanishtiruv]

Xato: [to'liq xato matni]
Fayl: src/modules/.../....ts
Nima qilmoqchi edim: [maqsad]
Nima sinab ko'rdim: [urinishlar]
```

### Yangi funksiya

```
[TO'LIQ tanishtiruv]

Yangi funksiya: [nima kerak]
Kim ishlatadi: [xaridor / sotuvchi / admin]
Nima uchun kerak: [muammo]

Avval REJA bering, kod yozmang. Rejani ma'qullaganimdan keyin
yozasiz.
```

### Dizayn

```
[QISQA tanishtiruv]

Ilova qorong'i va yorug' rejimda ishlaydi, Tailwind CSS 4.
Asosiy rang ko'k-binafsha (--primary tokeni).
Dizayn telefon uchun (375-430 piksel).

Vazifa: [nima o'zgarishi kerak]
```

Suratni ham qo'shing.

### Kodni tekshirish

```
[QISQA tanishtiruv]

Quyidagi kodni tekshiring: xavfsizlik teshigi, xato yoki
soddalashtirish imkoni bormi?

[kod]
```

---

## 6. Nima uchun bu fayl loyihada turibdi

Tanishtiruv matni loyiha bilan birga o'zgarishi kerak. Yangi modul
qo'shilsa yoki texnologiya almashsa, shu fayl yangilanadi va
keyingi suhbatda to'g'ri ma'lumot beriladi.

Raqamlarni yangilash uchun:

```bash
find src/app/api -name route.ts | wc -l     # API yo'llari
grep -c "^model " prisma/schema.prisma      # baza modellari
ls prisma/migrations | grep -c "^2"         # migratsiyalar
npm test 2>&1 | tail -3                     # sinovlar soni
```

# Ishga tushirishdan oldingi ro'yxat

Bu — Navix'ni haqiqiy foydalanuvchilarga ochishdan **oldin** bajariladigan
ishlar ro'yxati. Har bir band yonida "nima uchun" yozilgan: shunda qaysi
birini keyinga qoldirish mumkinligini o'zingiz hal qilasiz.

Tekshiruvni **ikkita** buyruq bajaradi.

**Chiqarishdan OLDIN** — sozlamalar to'g'rimi:

```bash
npm run deploy:check
```

U `.env.production` faylini o'qiydi (bo'lmasa `.env`). Ya'ni production
qiymatlarini alohida faylga yozib, lokal ishingizni buzmasdan
tekshirasiz.

**Chiqarishdan KEYIN** — sayt rostdan ishlayaptimi:

```bash
npm run smoke -- https://sizning-domeningiz
```

U haqiqiy manzilga murojaat qiladi va 24 ta narsani tekshiradi:
sahifalar ochiladimi, baza ulanganmi, himoya ishlayaptimi, xavfsizlik
sarlavhalari joyidami, xato javobida ichki tafsilot chiqib
ketmayaptimi.

Skript faqat **o'qiydi** — hisob yaratmaydi, xabar yubormaydi. Uni
ishlab turgan saytda istalgan paytda bemalol bajarish mumkin.

**Nima uchun ikkitasi:** sozlama to'g'ri bo'lib, sayt baribir
ochilmasligi mumkin — migratsiya bajarilmagan, Blob ulanmagan yoki
domen boshqa loyihaga qarab turgan bo'lishi mumkin. Birinchi buyruq
buni ko'rmaydi, ikkinchisi ko'radi.

---

## 1. Majburiy — bularsiz ishga tushirib bo'lmaydi

### 1.1. Kalitlar almashtirilganmi

Ishlab chiqish davomida ko'rilgan har qanday parol, token va kalit
**almashtirilishi shart**. Ular chatda, ekran suratida yoki logda
ko'ringan bo'lishi mumkin.

- Neon (baza) paroli;
- Upstash (Redis) tokeni;
- `JWT_ACCESS_SECRET` va `JWT_REFRESH_SECRET`.

**Nima uchun:** JWT kaliti bilan istalgan odam o'zini istalgan
foydalanuvchi qilib ko'rsata oladi — jumladan admin. Bu eng jiddiy
xavf.

Yangi JWT kaliti yasash:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

### 1.2. SMS xizmati ulanganmi

`SMS_PROVIDER=eskiz` bo'lishi va `ESKIZ_EMAIL` bilan `ESKIZ_SECRET`
to'ldirilgan bo'lishi kerak.

**Nima uchun:** `console` rejimida tasdiqlash kodi faqat server logida
ko'rinadi. Ya'ni **sizdan boshqa hech kim ro'yxatdan o'ta olmaydi**.

### 1.3. Rasm saqlash ulanganmi

`BLOB_READ_WRITE_TOKEN` — Vercel → loyiha → Storage → Create → Blob.

**Nima uchun:** Vercel'da disk vaqtinchalik. Kalitsiz yuklangan rasm
bir necha daqiqadan keyin ochilmay qoladi va foydalanuvchi buzilgan
rasmni ko'radi.

### 1.4. Migratsiyalar bajarilganmi

```bash
npm run db:migrate:deploy
```

**Nima uchun:** kod yangi ustunni kutadi, bazada esa u yo'q — natijada
har so'rov xato bilan tugaydi.

---

## 2. Kuchli tavsiya — bularsiz ishlaydi, lekin ko'r bo'lasiz

### 2.1. Xatolarni kuzatish — sozlash KERAK EMAS

Xatolar avtomatik yig'iladi va admin panelda ko'rinadi:

```
https://<sizning-domeningiz>/admin/errors
```

Server xatolari ham, brauzerdagi xatolar ham shu yerga tushadi. Bir xil
xatolar bitta qatorga yig'iladi va yonida "necha marta takrorlangan"
soni turadi.

**Nima uchun tashqi xizmat emas:** Sentry kabi xizmatlar kuchli, lekin
ular O'zbekistondan har doim ham ochilmaydi. Ochilmaydigan kuzatuv —
kuzatuv yo'qligi bilan bir xil.

**Ishga tushirgan kuningiz shu sahifani ochib turing.** Birinchi
soatlarda eng ko'p xato chiqadi va ular odatda oson tuzatiladi.

### 2.2. Push bildirishnomalar

```bash
npm run push:keys
```

Chiqqan ikkita kalitni `VAPID_PUBLIC_KEY` va `VAPID_PRIVATE_KEY` ga
yozing.

**Nima uchun:** usiz ilova **yopiq** bo'lganda xabar va qo'ng'iroq
haqida bildirishnoma kelmaydi — ya'ni chat va qo'ng'iroq amalda
ishlamaydi.

> Maxfiy kalitni hech kimga yubormang.

### 2.3. Qo'ng'iroq uchun zaxira yo'l (TURN)

`TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`.

**Nima uchun:** O'zbekiston mobil operatorlarining bir qismida ikki
telefon bevosita ulana olmaydi. Video qo'ng'iroqda bu muammo ko'proq
uchraydi. TURN — bu holatdagi yagona yo'l.

---

## 3. Ishga tushirgandan keyin — birinchi kunda

### 3.1. Hammasi tirikmi

Eng tez yo'l:

```bash
npm run smoke -- https://<sizning-domeningiz>
```

Yoki telefondan brauzerda oching:

```
https://<sizning-domeningiz>/api/health
```

Javobda `"status": "healthy"` bo'lishi kerak. `version` maydonida
hozir ishlab turgan versiya (git commit) ko'rinadi — "men tuzatdim,
lekin baribir eski xato chiqyapti" degan chalkashlik shu bilan hal
bo'ladi.

### 3.2. Xatolar bormi

```
https://<sizning-domeningiz>/admin/errors
```

Bo'sh bo'lsa — hammasi joyida. Xato chiqsa, matnini o'qing: unda
qaysi manzilda va nima bo'lgani yozilgan.

### 3.3. Havola qanday ko'rinadi

Domenni o'zingizga Telegram'da yuboring. Rasm, nom va tavsif
ko'rinishi kerak. Ko'rinmasa — Telegram eski nusxani saqlab qolgan
bo'lishi mumkin, `?v=2` qo'shib qayta yuboring.

### 3.4. Birinchi haqiqiy foydalanuvchi

O'zingizning ikkinchi raqamingiz bilan **to'liq yo'lni** bosib o'ting:
ro'yxatdan o'tish → SMS kodi → profil → hamyonni to'ldirish →
to'lov → chat → qo'ng'iroq → post.

**Nima uchun:** avtomatik sinovlar API'ni tekshiradi, lekin haqiqiy
SMS, haqiqiy to'lov va haqiqiy telefon kamerasini faqat shu yo'l
tekshiradi.

---

## 4. Tekshirilgan — hech narsa qilish shart emas

Quyidagilar 28-bosqichda **haqiqatan tekshirildi** (taxmin emas). Ular
allaqachon joyida va sizdan hech narsa talab qilmaydi.

| Nima | Holati |
|---|---|
| Kalitlar Git'ga tushmagan | `.env*` `.gitignore` da; repoda sir topilmadi |
| Xavfsizlik sarlavhalari | `X-Frame-Options`, `nosniff`, HSTS — `next.config.ts` da |
| Muhit o'zgaruvchilari tekshiruvi | JWT kalitlari kamida 32 belgi, majburiylari nomi bilan tekshiriladi |
| Baza indekslari | Barcha tashqi kalitlar indekslangan (0 ta bo'shliq) |
| Salomatlik yo'li | `/api/health` baza va Redis holatini qaytaradi |
| Xatolar jurnali | `/api/v1/client-errors` va admin paneli ishlaydi |
| Huquqiy hujjatlar | Shartlar, maxfiylik va oferta yozilgan |
| Kirish cheklovlari | Login, ro'yxatdan o'tish, OTP va parol tiklash cheklangan |
| Pul amallari | Kirish talab qiladi, `idempotencyKey` majburiy, soatiga 20 marta cheklangan |

33-bosqichda qo'shilganlar:

| Nima | Holati |
|---|---|
| Tashqi tekshiruv | `npm run smoke` — 24 ta tekshiruv, lokal manzilda sinaldi |
| CSP (xavfsiz qism) | `frame-ancestors`, `base-uri`, `form-action`, `object-src` — **majburiy** |
| CSP (qattiq qism) | Kuzatuv rejimida; buzilishlar `/admin/errors` ga tushadi |
| Salomatlik yo'li | Xato matni endi production'da yashiriladi (ichki manzil chiqib ketmaydi) |

### 4.1. `npm audit` uchta ogohlantirish beradi — bu MUAMMO emas

`npm audit` uchta "high" darajali ogohlantirish ko'rsatadi:

```
deepmerge-ts <8.0.0  →  @prisma/config  →  prisma
```

**Nima uchun tuzatilmaydi:**

1. `prisma` — bu **buyruq qatori vositasi** (`devDependencies`). U
   migratsiya va kod yaratish uchun kerak, ishlab chiqarish serverida
   umuman yo'q. Ilovada `@prisma/client` ishlaydi va u toza.
2. Zaiflik "rekursiv obyektni birlashtirganda stek to'lib ketishi" —
   u Prisma **sozlama faylini** o'qiyotganda yuz berishi mumkin. O'sha
   faylni biz yozamiz, tashqaridan hech kim o'zgartira olmaydi.
3. `npm audit fix --force` Prisma'ni **7 dan 6 ga tushiradi** — bu
   butun ma'lumotlar qatlamini buzadigan o'zgarish.

**Xulosa:** Prisma yangilanishini kutamiz. Ogohlantirishni ko'rganda
xavotirlanmang.

### 4.2. `/admin/errors` da "CSP" turidagi yozuvlar chiqadi — bu ham MUAMMO emas

Xatolar jurnalida `CSP` deb belgilangan yozuvlarni ko'rasiz, masalan:

```
CSP   script-src-elem — inline   /feed
```

**Bu xato emas.** Sayt to'liq ishlayapti va foydalanuvchi hech narsani
sezmaydi.

Nima bo'lyapti: brauzerga ikkita qoidalar to'plami yuboriladi.
Birinchisi — **majburiy** va u faqat loyihada umuman ishlatilmaydigan
narsalarni to'sadi. Ikkinchisi — **kuzatuv**: brauzer hech narsani
to'smaydi, faqat "bu qoidaga to'g'ri kelmadi" deb xabar beradi.

Bu yozuvlar aynan o'sha xabarlar. Ular kelajakda qattiq qoidani yoqish
uchun ro'yxat yig'ib beradi.

O'lchangan natija (22-avgust): ikki xil xabar keladi — Next.js'ning o'z
ichki skripti va tekshiruv kutubxonasining tezlashtirish urinishi.
Ikkalasi ham xavfsiz. Batafsil izoh `src/config/csp.ts` da.

---

## 5. Doim yodda tutiladigan qoidalar

- **Parol, token va kalitni hech kimga yubormang** — jumladan yordam
  so'ralayotgan odamga. Faqat xato MATNINI yuboring.
- **Terminal ekran suratini olishdan oldin** unda kalit yo'qligiga
  ishonch hosil qiling.
- **`.env` fayli hech qachon Git'ga tushmaydi** (`.gitignore` da).
  Agar bir marta tushgan bo'lsa — o'sha kalitlarning hammasi
  almashtirilishi shart.
- **Balansni qo'lda o'zgartirib bo'lmaydi.** Har bir pul harakati
  faqat tranzaksiya orqali yoziladi — hisobni doim tekshirish mumkin
  bo'lishi uchun.
- **Audit jurnali o'chirilmaydi.** Nizo chiqqanda yagona ishonchli
  manba — o'sha.

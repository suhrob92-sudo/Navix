# Ishga tushirishdan oldingi ro'yxat

Bu — Navix'ni haqiqiy foydalanuvchilarga ochishdan **oldin** bajariladigan
ishlar ro'yxati. Har bir band yonida "nima uchun" yozilgan: shunda qaysi
birini keyinga qoldirish mumkinligini o'zingiz hal qilasiz.

Tekshiruvning katta qismini bitta buyruq bajaradi:

```bash
npm run deploy:check
```

U `.env.production` faylini o'qiydi (bo'lmasa `.env`). Ya'ni production
qiymatlarini alohida faylga yozib, lokal ishingizni buzmasdan
tekshirasiz.

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

Telefondan oching:

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

## 4. Doim yodda tutiladigan qoidalar

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

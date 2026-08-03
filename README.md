# Navix — Markaziy Osiyo uchun AI Super App

Taksi, ovqat yetkazish, marketplace, to'lovlar, hamyon, ish qidirish, e'lonlar,
kuryer, mehmonxona, sayohat, chat va AI yordamchi — barchasi bitta platformada.

> **Holat:** 3-bosqich yakunlandi — poydevor, autentifikatsiya va shaxsiy kabinet
> (profil, manzillar, qurilmalar, bildirishnomalar, xavfsizlik) tayyor.
> Xizmat modullari keyingi bosqichlarda birma-bir ishga tushiriladi.

---

## Ishga tushirish

### Uchta buyruq

```bash
npm install     # bogʻliqliklar (Prisma klientini ham oʻzi yaratadi)
npm run setup   # .env + baza + Redis + jadvallar + rollar
npm run go      # ilovani ishga tushiradi va havolani chiqaradi
```

Tayyor. Havolani brauzerda oching.

> **Talab:** Docker ishlab turishi kerak (`docker ps` bilan tekshiring).
> Codespaces'da u avtomatik mavjud.

### `npm run setup` nima qiladi?

1. `.env` faylini `.env.example` dan yaratadi (agar yoʻq boʻlsa)
2. PostgreSQL va Redis konteynerlarini koʻtaradi
3. Baza javob berishini kutadi (konteyner darhol tayyor boʻlmaydi)
4. Jadvallarni yaratadi (migratsiya)
5. Rollar va ruxsatlarni yozadi (seed)

Skript bir necha marta ishga tushirilsa ham zarari yoʻq.

> **Production uchun:** `.env` dagi `JWT_ACCESS_SECRET` va
> `JWT_REFRESH_SECRET` ni albatta almashtiring:
> `openssl rand -base64 48`

### Qoʻlda bajarish

Agar bosqichlarni alohida koʻrmoqchi boʻlsangiz:

```bash
cp .env.example .env
npm run docker:up
npm run db:migrate:deploy
npm run db:seed
npm run dev
```

---

## Foydali buyruqlar

| Buyruq                | Nima qiladi                                            |
| --------------------- | ------------------------------------------------------ |
| `npm run dev`         | Ishlab chiqish serverini ishga tushiradi               |
| `npm run go`          | Baza + Redis + serverni birdan ishga tushiradi         |
| `npm run status`      | Server, baza va Redis ishlayaptimi — tekshiradi        |
| `npm run dev:bg`      | Serverni FONDA ishga tushiradi (terminal boʻsh qoladi) |
| `npm run dev:stop`    | Fondagi serverni toʻxtatadi                            |
| `npm run dev:log`     | Server logini jonli koʻrsatadi                         |
| `npm run share`       | Ommaviy havola ochadi (GitHub yoki Cloudflare tunneli) |
| `npm run url`         | Ochiq havolani qayta chiqaradi (yangisini ochmaydi)    |
| `npm run otp`         | Oxirgi SMS tasdiqlash kodini topib beradi              |
| `npm run build`       | Production uchun yig'adi                               |
| `npm run start`       | Yig'ilgan ilovani ishga tushiradi                      |
| `npm run verify`      | Turlar + lint + testlar — hammasini birdan tekshiradi  |
| `npm run typecheck`   | TypeScript xatolarini tekshiradi                       |
| `npm run lint`        | Kod uslubini tekshiradi                                |
| `npm run test`        | Testlarni bir marta ishga tushiradi                    |
| `npm run test:watch`  | Testlarni kuzatuv rejimida ishlatadi                   |
| `npm run format`      | Kodni avtomatik formatlaydi                            |
| `npm run db:generate` | Prisma klientini sxemadan yaratadi                     |
| `npm run db:studio`   | Bazani brauzerda ko'rish oynasini ochadi               |
| `npm run db:migrate`  | Yangi migratsiya yaratadi va qo'llaydi                 |
| `npm run db:seed`     | Boshlang'ich ma'lumotlarni yozadi                      |
| `npm run docker:up`   | PostgreSQL va Redis'ni ko'taradi                       |
| `npm run docker:down` | Konteynerlarni to'xtatadi                              |

---

## Telefondan ishlash (Codespaces + Termux)

Kompyuter yo'q bo'lsa, loyihani telefondan boshqarish mumkin:
**terminal telefonda** (Termux — tez), **og'ir dasturlar bulutda** (Codespaces).

### Nima uchun bunday?

Brauzerdagi Codespaces muharriri telefonda og'ir ishlaydi. Termux esa
Androidning o'z terminali — yengil va tez. Termux'ga Node yoki PostgreSQL
o'rnatish shart emas: u faqat ulanish vositasi.

### Bir martalik sozlash

```bash
# Termux'da (telefonda)
pkg install gh openssh -y
gh auth login                                  # brauzer orqali kirish
gh auth refresh -h github.com -s codespace     # Codespaces ruxsati
```

### Har safar ishlash tartibi

Ikki buyruq — tamom:

```bash
gh codespace ssh     # Codespaces'ga ulanish
npm run go           # baza + Redis + server, oxirida havola chiqadi
```

`npm run go` terminalni band qilmaydi — havolani ko'chirib brauzerda ochasiz.

### Ishlayaptimi yoki yo'qmi?

Brauzerda **404** chiqsa yoki sahifa ochilmasa, avval holatni tekshiring:

```bash
npm run status
```

```
📊 Tizim holati

   ✅ Server        — ishlayapti (3000-port)
   ✅ Baza          — ulangan
   ✅ Redis         — ulangan
```

Biror joyda ❌ bo'lsa — `npm run go` hammasini qayta ko'taradi.

### Brauzerda 404 chiqsa

`HTTP ERROR 404` — sahifa yo'q degani EMAS. U **port tashqariga
ochilmagan** degani. Ikki sabab bo'lishi mumkin:

1. Server umuman ishlamayapti (codespace uxlab qolgan bo'lsa shunday bo'ladi);
2. Server ishlayapti, lekin port `private` — tashqaridan kirib bo'lmaydi.

**Yechim — bitta buyruq:**

```bash
npm run share
```

Nima qiladi:

1. serverni kutadi (40 soniyagacha) va ishlayotganini tekshiradi;
2. GitHub portini `public` qilishga urinadi;
3. ishlamasa — **Cloudflare tunneli** orqali ommaviy havola ochadi;
4. tayyor havolani chiqaradi.

`npm run go` oxirida buni avtomatik chaqiradi — odatda alohida yozish
shart emas. `npm run dev:stop` esa havolani ham yopadi.

**Nima uchun ikkita yo'l bor.** GitHub portni o'z tunneliga faqat
codespace **brauzerda** ochilganda ro'yxatdan o'tkazadi — aynan o'shanda
ishga tushadigan muharrir buni bajaradi. Termux'dan `gh codespace ssh`
bilan ulanilganda muharrir ishlamaydi va quyidagi xato chiqadi:

```
error getting tunnel port: ... response: 404 Not Found
```

Cloudflare tunneli bu zanjirga bog'liq emas: codespace ichidan
tashqariga ulanadi va o'zi `https://...trycloudflare.com` havolasini
beradi. Hisob talab qilinmaydi. Fayli birinchi ishlatishda `.cache/`
papkasiga yuklab olinadi (~40 MB, bir martalik).

> Cloudflare havolasi har qayta ishga tushirilganda **o'zgaradi** —
> shuning uchun `npm run go` chiqargan havolani ishlating.

### Sahifa ochildi-yu, tugmalar ishlamasa

Sahifa ko'rinadi, lekin hech bir tugma bosilmaydi va tugmalar o'rnida
bo'sh kulrang to'rtburchaklar turadi — bu **hidratsiya** ishlamagani.
Ya'ni HTML kelgan, lekin JavaScript kelmagan: React umuman ishga
tushmagan.

**Sabab.** Next.js 16 dev serveri `localhost` dan boshqa domendan
kelgan so'rovlarga `/_next/static/*` fayllarini bermaydi — `403`
qaytaradi. Bu himoya chorasi, lekin biz ilovani ataylab tashqi manzil
orqali ochamiz.

**Yechim** — `next.config.ts` dagi `allowedDevOrigins`:

```ts
allowedDevOrigins: ['*.app.github.dev', '*.github.dev', '*.trycloudflare.com'],
```

Bu allaqachon sozlangan. Boshqa tunnel xizmatini ishlatsangiz, uning
domenini shu ro'yxatga qo'shing va serverni qayta ishga tushiring
(`npm run go`). Sozlama faqat dev rejimida ta'sir qiladi.

**Bir martalik doimiy yechim** (xohlasangiz): codespace'ni brauzerda
ochib, portni bir marta public qilib qo'ysangiz, GitHub buni eslab
qoladi va keyin har safar Termux'dan ishlaganda ham ishlaydi:

1. `github.com/codespaces` → shu codespace'ni brauzerda oching
2. Pastdagi **PORTS** bo'limiga o'ting
3. `3000`-port ustiga bosib turing → **Port Visibility** → **Public**

**Ishlamaydigan yo'llar** (vaqt sarflamang, sinalgan):

| Yo'l                                               | Nima bo'ladi                                                                                                                                                                                                                                                               |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gh codespace ports visibility 3000:public`        | `404 Not Found` — `--codespace` nomi berilmasa va server ishlamasa xato beradi. `npm run share` ikkalasini ham to'g'ri bajaradi                                                                                                                                            |
| `gh codespace ports forward 3000:3000`             | `ssh: unexpected packet` — Termux'da SSH kanali ochilmaydi                                                                                                                                                                                                                 |
| `.devcontainer/devcontainer.json` + `forwardPorts` | **Codespace umuman ishga tushmay qoladi.** GitHub standart sozlamasida Docker allaqachon bor; o'z faylimizda `docker-in-docker` qo'shilsa ikkalasi to'qnashadi va `failed to start vs code remote server` xatosi chiqadi. Shu sababli loyihada devcontainer fayli **yo'q** |

### Aloqa uzilib qolsa

Mobil internetda SSH aloqasi uzilishi normal holat:

```
Connection to localhost closed by remote host.
shell closed: exit status 255
```

Bunda siz **telefonning o'z terminaliga** qaytasiz. Qaysi joydaligingizni
buyruq satridan bilib olasiz:

| Satr                                            | Qayerdasiz         |
| ----------------------------------------------- | ------------------ |
| `@foydalanuvchi ➜ /workspaces/Navix (branch) $` | Codespaces ichida  |
| `~ $` yoki `~/downloads $`                      | Telefonning o'zida |

Qayta ulanish uchun shunchaki:

```bash
gh codespace ssh
```

**Muhim:** server `dev:bg` bilan ishga tushirilgan bo'lsa, aloqa uzilganda ham
**to'xtamaydi** (`nohup` tufayli). Qayta ulangach `npm run url` bilan havolani
olib, ishni davom ettiraverasiz.

### Uzilishlarni kamaytirish

Termux'da bir marta bajaring — SSH har 30 soniyada "tirikman" signali yuboradi:

```bash
mkdir -p ~/.ssh
printf 'Host *\n  ServerAliveInterval 30\n  ServerAliveCountMax 6\n' >> ~/.ssh/config
```

### SMS kodni olish

Ishlab chiqish rejimida haqiqiy SMS yuborilmaydi. Kodni olish uchun:

```bash
npm run otp
```

```
📩 Oxirgi tasdiqlash kodi:

   781769
```

### Foydali

```bash
npm run url        # havolani qayta chiqarish
npm run dev:log    # log'ni jonli kuzatish (chiqish: Ctrl+C)
npm run dev:stop   # serverni to'xtatish
```

> **Eslatma:** `npm run dev` (fonsiz) terminalni to'liq band qiladi va
> telefonda noqulay. Telefondan ishlaganda doim `npm run dev:bg` ishlating.

---

## Loyiha tuzilishi

```
Navix/
├── prisma/
│   ├── schema.prisma        # Ma'lumotlar bazasi sxemasi
│   └── seed.ts              # Boshlang'ich ma'lumotlar (rollar, ruxsatlar)
├── src/
│   ├── app/                 # Sahifalar va API endpointlari (Next.js App Router)
│   │   ├── api/health/      # Tizim salomatligini tekshirish
│   │   ├── api/openapi/     # API hujjati (JSON)
│   │   ├── layout.tsx       # Umumiy sahifa qolipi
│   │   ├── page.tsx         # Bosh sahifa
│   │   ├── error.tsx        # Xatolik ekrani
│   │   ├── loading.tsx      # Yuklanish ekrani
│   │   └── not-found.tsx    # 404 sahifasi
│   ├── components/
│   │   ├── ui/              # Asosiy qurilish bloklari (Button, Card, Badge...)
│   │   ├── layout/          # Header, Footer, Logo, mavzu tugmasi
│   │   ├── shared/          # Modullar aro qayta ishlatiladigan bloklar
│   │   └── providers/       # React kontekst provayderlari
│   ├── modules/             # BIZNES MODULLARI
│   │   ├── auth/            # Autentifikatsiya (JWT, OTP, sessiyalar)
│   │   ├── profile/         # Profil va sozlamalar
│   │   ├── address/         # Manzillar (umumiy — barcha xizmatlar uchun)
│   │   └── notification/    # Bildirishnomalar
│   ├── config/
│   │   ├── modules.ts       # SUPER APP MODULLAR REYESTRI
│   │   ├── rbac.ts          # Rollar va ruxsatlar
│   │   ├── cabinet-nav.ts   # Kabinet navigatsiyasi
│   │   └── site.ts          # Brend sozlamalari
│   ├── hooks/               # Qayta ishlatiladigan React hook'lar
│   ├── proxy.ts             # Sahifalarni tez filtrlash (Next.js 16)
│   └── lib/
│       ├── api/             # API javob formati, xatoliklar, handler
│       ├── openapi/         # OpenAPI spetsifikatsiyasi
│       ├── env.ts           # Muhit o'zgaruvchilari validatsiyasi
│       ├── prisma.ts        # Baza klienti
│       ├── redis.ts         # Kesh klienti
│       ├── logger.ts        # Jurnal yozuvchi
│       └── utils.ts         # Yordamchi funksiyalar
├── scripts/                 # Yordamchi skriptlar (share, url, otp, dev:stop)
│   └── lib/tunnel.mjs       # Ommaviy havola (Cloudflare tunneli)
├── docker-compose.yml       # Lokal PostgreSQL + Redis
├── Dockerfile               # Production image
└── next.config.ts           # Next.js va xavfsizlik sozlamalari
```

---

## Arxitektura tamoyillari

### 1. Modulli monolit → mikroservislarga tayyor

Har bir xizmat (taksi, ovqat, to'lov) mustaqil modul sifatida yoziladi.
Modullar bir-birini to'g'ridan-to'g'ri chaqirmaydi — faqat umumiy qatlamlar
(`lib`, `config`) orqali ishlaydi. Shu sababli kelajakda istalgan modulni
alohida serverga ajratish mumkin bo'ladi.

### 2. Modullar reyestri — yagona haqiqat manbai

`src/config/modules.ts` — barcha modullar ro'yxati. Bosh sahifa, menyu,
footer va AI yordamchi shu bitta fayldan oziqlanadi. Yangi modul qo'shish
uchun faqat shu faylga bitta yozuv qo'shiladi.

### 3. API javoblari yagona formatda

Har bir API bir xil "envelope" qaytaradi:

```jsonc
// Muvaffaqiyat
{ "success": true, "data": { }, "meta": { "requestId": "...", "timestamp": "..." } }

// Xatolik
{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." }, "meta": { } }
```

Shu sababli frontend har bir modul uchun alohida ishlov yozmaydi.

### 4. Xavfsizlik poydevordan

- Barcha muhit o'zgaruvchilari ishga tushishda tekshiriladi (`src/lib/env.ts`);
- Parollar hech qachon ochiq saqlanmaydi — faqat hash;
- Refresh token'larning hash'i saqlanadi;
- Log'larda parol, token va karta raqamlari avtomatik yashiriladi;
- Xavfsizlik HTTP sarlavhalari `next.config.ts` da yoqilgan;
- Rollarga asoslangan ruxsatlar (RBAC) — `src/config/rbac.ts`;
- Barcha muhim amallar audit jurnaliga yoziladi.

### 5. Pul — hech qachon kasr son emas

Barcha moliyaviy summalar **tiyinlarda** (`BigInt`) saqlanadi.
1 so'm = 100 tiyin. Bu kasr xatoliklarining oldini oladi.

---

## API hujjati

Ilova ishlab turganda OpenAPI spetsifikatsiyasi shu manzilda:

```
http://localhost:3000/api/openapi
```

Uni Postman yoki Insomnia'ga import qilib, endpointlarni sinash mumkin.

### Mavjud endpointlar

**Tizim**

| Metod | Manzil         | Tavsif                                    |
| ----- | -------------- | ----------------------------------------- |
| GET   | `/api/health`  | Baza va Redis holatini tekshiradi         |
| GET   | `/api/openapi` | API hujjatini JSON ko'rinishida qaytaradi |

**Autentifikatsiya** (`/api/v1/auth/...`)

| Metod  | Manzil             | Tavsif                                | Token kerakmi |
| ------ | ------------------ | ------------------------------------- | ------------- |
| POST   | `/register`        | Hisob yaratish + SMS kod yuborish     | Yo'q          |
| POST   | `/verify-otp`      | Kodni tasdiqlash, hisobni faollashtir | Yo'q          |
| POST   | `/resend-otp`      | Kodni qayta yuborish                  | Yo'q          |
| POST   | `/login`           | Telefon + parol bilan kirish          | Yo'q          |
| POST   | `/refresh`         | Access token yangilash                | Cookie        |
| POST   | `/logout`          | Joriy sessiyadan chiqish              | Ixtiyoriy     |
| GET    | `/me`              | Joriy foydalanuvchi va ruxsatlari     | Ha            |
| POST   | `/password/forgot` | Parolni tiklash uchun kod so'rash     | Yo'q          |
| POST   | `/password/reset`  | Yangi parol o'rnatish                 | Yo'q          |
| GET    | `/sessions`        | Faol qurilmalar ro'yxati              | Ha            |
| DELETE | `/sessions`        | Boshqa qurilmalardan chiqish          | Ha            |

**Profil** (`/api/v1/profile`)

| Metod | Manzil      | Tavsif                    |
| ----- | ----------- | ------------------------- |
| GET   | `/`         | Profil ma'lumotlari       |
| PATCH | `/`         | Profilni qisman yangilash |
| POST  | `/password` | Parolni o'zgartirish      |

**Manzillar** (`/api/v1/addresses`) — taksi, ovqat va kuryer modullari uchun umumiy

| Metod  | Manzil  | Tavsif              |
| ------ | ------- | ------------------- |
| GET    | `/`     | Saqlangan manzillar |
| POST   | `/`     | Manzil qo'shish     |
| GET    | `/{id}` | Bitta manzil        |
| PATCH  | `/{id}` | Manzilni tahrirlash |
| DELETE | `/{id}` | Manzilni o'chirish  |

**Bildirishnomalar** (`/api/v1/notifications`)

| Metod | Manzil  | Tavsif                              |
| ----- | ------- | ----------------------------------- |
| GET   | `/`     | Ro'yxat (sahifalab) + o'qilmaganlar |
| PATCH | `/`     | Barchasini o'qilgan deb belgilash   |
| PATCH | `/{id}` | Bittasini o'qilgan deb belgilash    |

---

## Shaxsiy kabinet

Kirgan foydalanuvchi `/dashboard` sahifasiga tushadi. Kabinet sahifalari:

| Sahifa           | Nima qiladi                                            |
| ---------------- | ------------------------------------------------------ |
| `/dashboard`     | Qisqacha ma'lumot va barcha xizmatlar ro'yxati         |
| `/profile`       | Ism, rasm, til, mavzu, vaqt zonasi sozlamalari         |
| `/addresses`     | Uy va ish manzillari (koordinatalari bilan)            |
| `/notifications` | Barcha modullardan kelgan xabarlar                     |
| `/devices`       | Kirgan qurilmalar — bittasini yoki hammasini chiqarish |
| `/security`      | Parolni o'zgartirish va himoya holati                  |

Telefonda navigatsiya pastki panelda (barmoq bilan yetib borish oson),
kompyuterda esa chap tomonda yon menyu ko'rinishida.

### Sahifalar himoyasi — uch qatlam

1. **Proxy** (`src/proxy.ts`) — cookie yo'q bo'lsa sahifani yuklamasdan
   darhol kirish sahifasiga yo'naltiradi. Bu faqat tezlik uchun, himoya emas.
2. **`<RequireAuth>`** — brauzerda sessiyani tekshiradi va yo'naltiradi.
3. **`requireAuth()` API'da** — HAQIQIY himoya. Token to'liq tekshiriladi.
   Birinchi ikki qatlamni chetlab o'tish mumkin, lekin bu hech narsa bermaydi:
   ma'lumot baribir serverdan token bilan so'raladi.

### Manzillar nima uchun alohida modul?

Taksi chaqirganda ham, ovqat buyurtma qilganda ham, kuryer chaqirganda ham
bir xil savol beriladi: "qayerga?". Agar har bir modul o'z manzil tizimini
yozsa — foydalanuvchi uy manzilini uch marta kiritishga majbur bo'lardi.

Shuning uchun manzillar `src/modules/address` da umumiy modul sifatida yozilgan.
Har bir manzilda koordinatalar ham saqlanadi — haydovchi va kuryer aniq joyni
topishi uchun.

Qoidalar:

- Bir vaqtda faqat **bitta standart manzil** bo'ladi;
- Birinchi qo'shilgan manzil avtomatik standart bo'ladi;
- O'chirish **yumshoq** (soft delete) — eski buyurtmalarda manzil ko'rinib turadi;
- Standart manzil o'chirilsa, eng yangi qolgan manzil standart bo'ladi.

---

## Autentifikatsiya qanday ishlaydi

### Ro'yxatdan o'tish oqimi

```
1. Foydalanuvchi telefon + parol + ism kiritadi
2. Hisob PENDING_VERIFICATION holatida yaratiladi
3. Raqamga 6 xonali kod yuboriladi (5 daqiqa amal qiladi)
4. Kod tasdiqlanadi  →  hisob ACTIVE bo'ladi
                      →  CUSTOMER roli beriladi
                      →  hamyon ochiladi
5. Access + refresh token beriladi
```

### Ikki xil token

| Token       | Muddati   | Qayerda saqlanadi      | Nima uchun                     |
| ----------- | --------- | ---------------------- | ------------------------------ |
| **Access**  | 15 daqiqa | Brauzer xotirasi (RAM) | Har so'rovda yuboriladi        |
| **Refresh** | 30 kun    | `httpOnly` cookie      | Yangi access token olish uchun |

Access token `localStorage` da saqlanmaydi — JavaScript o'qiy oladigan joyda
token saqlash XSS hujumida uni o'g'irlanishiga olib keladi. Refresh token esa
`httpOnly` cookie'da — unga JavaScript umuman kira olmaydi.

### Token rotation (almashtirish)

Har safar `/refresh` chaqirilganda refresh token ham yangisiga almashtiriladi.
Agar eski token qayta ishlatilsa — bu o'g'irlik belgisi, shuning uchun sessiya
darhol bekor qilinadi.

### Himoya choralari

| Chora                     | Qanday ishlaydi                                         |
| ------------------------- | ------------------------------------------------------- |
| Parol hash'i              | bcrypt, 12 rounds — ochiq parol hech qachon saqlanmaydi |
| Timing attack himoyasi    | Foydalanuvchi topilmasa ham bcrypt chaqiriladi          |
| User enumeration himoyasi | Mavjud/mavjud emas raqamga bir xil javob                |
| Rate limiting             | Kirish: 15 daq/10 marta, SMS: soatiga 5 marta           |
| OTP urinishlari           | 5 marta xato → kod bekor qilinadi                       |
| Refresh token saqlash     | Bazada faqat SHA-256 hash                               |
| Parol o'zgarganda         | Barcha qurilmalardagi sessiyalar bekor qilinadi         |
| Audit jurnali             | Har bir kirish, chiqish va parol o'zgarishi yoziladi    |

### SMS xizmati

Ishlab chiqishda `SMS_PROVIDER=console` — kod terminalga chiqadi, SMS
yuborilmaydi va pul sarflanmaydi:

```
┌───────────────── SMS (ishlab chiqish rejimi) ─────────────────
│ Kimga: +998901234567
│ Matn:  Navix: tasdiqlash kodi 123456. Kod 5 daqiqa amal qiladi.
└───────────────────────────────────────────────────────────────
```

Production'da `SMS_PROVIDER=eskiz` qo'yiladi va Eskiz.uz kalitlari beriladi.

---

## Dizayn tizimi

Barcha ranglar, radiuslar va animatsiyalar `src/app/globals.css` faylida
"token" ko'rinishida saqlanadi. Komponentlarda qattiq rang yozilmaydi.

- **Och va to'q rejim** — avtomatik (tizim sozlamasi) yoki qo'lda almashtiriladi;
- **Glassmorphism** — `.glass` klassi;
- **Animatsiyalar** — `animate-fade-up`, `animate-scale-in`, `animate-aurora`;
- **Responsive** — telefon birinchi o'rinda (mobile-first).

---

## Texnologiyalar

| Qatlam       | Texnologiya                      |
| ------------ | -------------------------------- |
| Framework    | Next.js 16 (App Router)          |
| Til          | TypeScript (strict)              |
| UI           | React 19, Tailwind CSS 4         |
| Komponentlar | Shadcn uslubi (CVA + Radix Slot) |
| Baza         | PostgreSQL 17 + Prisma 7         |
| Kesh         | Redis 7 (ioredis)                |
| Validatsiya  | Zod                              |
| Auth         | JWT (jose) + bcrypt              |
| Log          | Pino                             |
| Testlar      | Vitest + Testing Library         |
| Infratuzilma | Docker Compose                   |

---

## Yo'l xaritasi

- [x] **1-bosqich** — Poydevor: arxitektura, baza sxemasi, dizayn tizimi, API qatlami, Docker, testlar
- [x] **2-bosqich** — Autentifikatsiya: ro'yxatdan o'tish, SMS tasdiqlash, kirish, sessiyalar, parolni tiklash
- [x] **3-bosqich** — Kabinet: profil, manzillar, qurilmalar, bildirishnomalar, xavfsizlik
- [ ] **4-bosqich** — Hamyon va to'lovlar
- [ ] **5-bosqich** — Birinchi modul (taksi yoki ovqat yetkazish)
- [ ] **6-bosqich** — AI yordamchi
- [ ] **7-bosqich** — Admin panel

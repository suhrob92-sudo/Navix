# Navix — Markaziy Osiyo uchun AI Super App

Taksi, ovqat yetkazish, marketplace, to'lovlar, hamyon, ish qidirish, e'lonlar,
kuryer, mehmonxona, sayohat, chat va AI yordamchi — barchasi bitta platformada.

> **Holat:** 1-bosqich yakunlandi — loyiha poydevori (arxitektura, baza, dizayn
> tizimi, API qatlami, Docker, testlar) tayyor. Modullar keyingi bosqichlarda
> birma-bir ishga tushiriladi.

---

## Ishga tushirish (5 qadam)

### 1-qadam. Bog'liqliklarni o'rnatish

```bash
npm install
```

### 2-qadam. Muhit faylini yaratish

```bash
cp .env.example .env
```

`.env` faylini oching va JWT kalitlarini almashtiring. Yangi kalit yaratish:

```bash
openssl rand -base64 48
```

### 3-qadam. Baza va Redis'ni ko'tarish

```bash
npm run docker:up
```

Bu buyruq PostgreSQL (5432-port) va Redis (6379-port) konteynerlarini ishga tushiradi.

### 4-qadam. Bazani tayyorlash

```bash
npm run db:migrate    # jadvallarni yaratadi
npm run db:seed       # rollar va ruxsatlarni yozadi
```

### 5-qadam. Ilovani ishga tushirish

```bash
npm run dev
```

Brauzerda oching: **http://localhost:3000**

> **Qisqa yo'l:** yuqoridagi 1, 3, 4-qadamlarni bitta buyruq bajaradi —
> `npm run setup` (avval `.env` faylini yaratib oling).

---

## Foydali buyruqlar

| Buyruq                | Nima qiladi                                           |
| --------------------- | ----------------------------------------------------- |
| `npm run dev`         | Ishlab chiqish serverini ishga tushiradi              |
| `npm run build`       | Production uchun yig'adi                              |
| `npm run start`       | Yig'ilgan ilovani ishga tushiradi                     |
| `npm run verify`      | Turlar + lint + testlar — hammasini birdan tekshiradi |
| `npm run typecheck`   | TypeScript xatolarini tekshiradi                      |
| `npm run lint`        | Kod uslubini tekshiradi                               |
| `npm run test`        | Testlarni bir marta ishga tushiradi                   |
| `npm run test:watch`  | Testlarni kuzatuv rejimida ishlatadi                  |
| `npm run format`      | Kodni avtomatik formatlaydi                           |
| `npm run db:studio`   | Bazani brauzerda ko'rish oynasini ochadi              |
| `npm run db:migrate`  | Yangi migratsiya yaratadi va qo'llaydi                |
| `npm run db:seed`     | Boshlang'ich ma'lumotlarni yozadi                     |
| `npm run docker:up`   | PostgreSQL va Redis'ni ko'taradi                      |
| `npm run docker:down` | Konteynerlarni to'xtatadi                             |

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
│   ├── config/
│   │   ├── modules.ts       # SUPER APP MODULLAR REYESTRI
│   │   ├── rbac.ts          # Rollar va ruxsatlar
│   │   └── site.ts          # Brend sozlamalari
│   ├── hooks/               # Qayta ishlatiladigan React hook'lar
│   └── lib/
│       ├── api/             # API javob formati, xatoliklar, handler
│       ├── openapi/         # OpenAPI spetsifikatsiyasi
│       ├── env.ts           # Muhit o'zgaruvchilari validatsiyasi
│       ├── prisma.ts        # Baza klienti
│       ├── redis.ts         # Kesh klienti
│       ├── logger.ts        # Jurnal yozuvchi
│       └── utils.ts         # Yordamchi funksiyalar
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

| Metod | Manzil         | Tavsif                                    |
| ----- | -------------- | ----------------------------------------- |
| GET   | `/api/health`  | Baza va Redis holatini tekshiradi         |
| GET   | `/api/openapi` | API hujjatini JSON ko'rinishida qaytaradi |

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
- [ ] **2-bosqich** — Autentifikatsiya: ro'yxatdan o'tish, kirish, SMS tasdiqlash, sessiyalar
- [ ] **3-bosqich** — Foydalanuvchi kabineti va profil
- [ ] **4-bosqich** — Hamyon va to'lovlar
- [ ] **5-bosqich** — Birinchi modul (taksi yoki ovqat yetkazish)
- [ ] **6-bosqich** — AI yordamchi
- [ ] **7-bosqich** — Admin panel

# Navix — Markaziy Osiyo uchun AI Super App

Taksi, ovqat yetkazish, marketplace, to'lovlar, hamyon, ish qidirish, e'lonlar,
kuryer, mehmonxona, sayohat, chat va AI yordamchi — barchasi bitta platformada.

> **Holat:** 13-bosqich yakunlandi.
>
> Tayyor: poydevor, autentifikatsiya, shaxsiy kabinet, **hamyon**
> (balans, to'ldirish, o'tkazma, tarix), **to'lovlar** (kommunal,
> internet, mobil aloqa, TV — 14 ta provayder, saqlangan hisoblar, chek),
> **bildirishnomalar**, **admin panel** (xizmatlar, foydalanuvchilar,
> pulni qaytarish, audit jurnali), **ovqat yetkazish** — restoranlar,
> menyu, savat, buyurtma, bekor qilish, **restoran kabineti**
> (buyurtma holatini boshqarish) va **AI Yordamchi** — oddiy tilda
> yozilgan buyruqni tushunib to'lov, o'tkazma **va ovqat buyurtmasini**
> tayyorlaydi.
>
> Qolgan xizmat modullari keyingi bosqichlarda birma-bir ishga tushiriladi.

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

| Buyruq                      | Nima qiladi                                                       |
| --------------------------- | ----------------------------------------------------------------- |
| `npm run dev`               | Ishlab chiqish serverini ishga tushiradi                          |
| `npm run go`                | Baza + Redis + serverni birdan ishga tushiradi                    |
| `npm run status`            | Server, baza, Redis va jadvallar mosligini tekshiradi             |
| `npm run update`            | Kodni xavfsiz yangilaydi (git pull + npm install)                 |
| `npm run dev:bg`            | Serverni FONDA ishga tushiradi (terminal boʻsh qoladi)            |
| `npm run dev:stop`          | Fondagi serverni toʻxtatadi                                       |
| `npm run dev:log`           | Server logini jonli koʻrsatadi                                    |
| `npm run share`             | Vaqtinchalik havola ochadi (har safar yangi — sinov uchun)        |
| `npm run url`               | Ochiq havolani qayta chiqaradi (yangisini ochmaydi)               |
| `npm run env:setup`         | Production sozlamalarini savol-javob bilan yozadi                 |
| `npm run deploy:check`      | Production tayyorligini tekshiradi (baza, Redis, kalitlar)        |
| `npm run deploy:db`         | Bulutdagi bazaga migratsiya va boshlang'ich ma'lumotlarni yozadi  |
| `npm run deploy:vars`       | Vercel'ga qo'yiladigan o'zgaruvchilarni tayyor holda chiqaradi    |
| `npm run otp`               | Oxirgi SMS tasdiqlash kodini topib beradi                         |
| `npm run role:grant`        | Foydalanuvchiga rol beradi (birinchi adminni yaratish uchun)      |
| `npm run restaurant:assign` | Restoranni egasiga biriktiradi (MERCHANT roli bilan)              |
| `npm run build`             | Production uchun yig'adi                                          |
| `npm run start`             | Yig'ilgan ilovani ishga tushiradi                                 |
| `npm run verify`            | Turlar + lint + testlar — hammasini birdan tekshiradi             |
| `npm run typecheck`         | TypeScript xatolarini tekshiradi                                  |
| `npm run lint`              | Kod uslubini tekshiradi                                           |
| `npm run test`              | Testlarni bir marta ishga tushiradi                               |
| `npm run test:watch`        | Testlarni kuzatuv rejimida ishlatadi                              |
| `npm run format`            | Kodni avtomatik formatlaydi                                       |
| `npm run db:generate`       | Prisma klientini sxemadan yaratadi (dev/build o'zi ham chaqiradi) |
| `npm run db:studio`         | Bazani brauzerda ko'rish oynasini ochadi                          |
| `npm run db:migrate`        | Yangi migratsiya yaratadi va qo'llaydi                            |
| `npm run db:seed`           | Boshlang'ich ma'lumotlarni yozadi                                 |
| `npm run docker:up`         | PostgreSQL va Redis'ni ko'taradi                                  |
| `npm run docker:down`       | Konteynerlarni to'xtatadi                                         |

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

> **Doimiy havola kerakmi?** `npm run share` har safar yangi manzil
> beradi. O'zgarmaydigan havola uchun
> [Doimiy manzil — Vercel'ga chiqarish](#doimiy-manzil--vercelga-chiqarish)
> bo'limiga qarang.

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

### "Serverda kutilmagan xatolik" chiqsa

Sahifa ochiladi, lekin ro'yxat o'rnida qizil xato turadi. Eng ko'p
uchraydigan sabab — `git pull` dan keyin **migratsiya bajarilmagan**:
kod yangi jadvalni so'rayapti, bazada esa u yo'q.

**Avval holatni tekshiring:**

```bash
npm run status
```

```
   ✅ Server        — ishlayapti (3000-port)
   ✅ Baza          — ulangan
   ✅ Redis         — ulangan
   ❌ Jadvallar     — MOS EMAS      ← sabab shu
```

**Tuzatish:**

```bash
npm run db:migrate:deploy
npm run db:seed
```

**Sabab aniq ko'rinishi.** Ishlab chiqish rejimida xato matni ekranga
ham chiqadi:

```
Serverda kutilmagan xatolik yuz berdi.

[dev] The table `public.service_providers` does not exist
```

Production'da bu qism **umuman yuborilmaydi** — jadval nomlari va ichki
tuzilma tashqariga chiqmasligi kerak.

### `npm error Missing script: "..."` chiqsa

```
npm error Missing script: "role:grant"
```

**Sabab.** Buyruq mavjud, lekin SIZDA emas. Har bosqichda yangi buyruq
qo'shilishi mumkin, u esa `package.json` da yozilgan — ya'ni kod
yangilanmaguncha buyruq ham paydo bo'lmaydi.

Xato buyruq haqida gapiradi, aslida sabab boshqa joyda — shuning uchun
bu eng chalg'ituvchi xatolardan biri.

**Tekshirish:**

```bash
npm run status
```

```
⚠️  KOD ESKIRGAN

   GitHub'da 1 ta yangi commit bor.
```

**Tuzatish:**

```bash
git pull origin claude/ai-super-app-setup-fxkrux
npm run db:migrate:deploy
npm run db:seed
```

Uchtasi birga bajarilishi kerak: yangi kod ko'pincha yangi jadval
(`migrate`) va yangi boshlang'ich ma'lumot (`seed`) talab qiladi.

> **Belgisi:** `npm run db:seed` chiqargan sonlar (`N ta ruxsat`,
> `N ta rol-ruxsat bog'lanishi`) yangilanishdan keyin ODATDA o'zgaradi.
> Sonlar o'zgarmasa — pull bajarilmagan.

### "Export ... doesn't exist in target module" chiqsa

Baza sxemasi o'zgargandan keyin shunga o'xshash xato chiqishi mumkin:

```
Export TransactionDirection doesn't exist in target module
./src/modules/wallet/wallet.service.ts
```

**Sabab.** `prisma/schema.prisma` ga yangi ustun yoki enum qo'shilganda
ikki narsa yangilanishi kerak:

1. **Baza** — `npm run db:migrate:deploy` (SQL o'zgarishi);
2. **Prisma klienti** — kodda ishlatiladigan turlar (`npm run db:generate`).

Faqat birinchisi bajarilsa, kod hali eski turlarni ko'radi.

**Yechim.** `npm run dev` va `npm run build` endi klientni HAR SAFAR
o'zi yangilaydi, shuning uchun `npm run go` yetarli. Agar baribir xato
chiqsa, qo'lda:

```bash
npm run db:generate
npm run go
```

### "Error 1033 — Cloudflare Tunnel error" chiqsa

Havola ishlab turgandi, keyin to'satdan shu xato chiqadi:

```
Error 1033
Cloudflare Tunnel error
```

**Sabab.** Tunnel uzilib qolgan. Bu odatiy hol: codespace uxlab qolsa,
mobil internet uzilsa yoki `npm run dev:stop` bajarilsa tunnel yopiladi.

**Yechim — bitta buyruq:**

```bash
npm run share
```

U eski havolaning haqiqatan javob berayotganini `/api/health` orqali
tekshiradi. Javob bermasa — eskisini yopib, yangisini ochadi.

> Yangi havola **boshqacha** bo'ladi — Cloudflare "quick tunnel" har
> safar yangi manzil beradi. Eski havolani saqlab qo'yish foydasiz.

**Havola o'zgarmasligini xohlasangiz** — codespace'ni bir marta
brauzerda ochib, `3000`-portni Public qilib qo'ying (pastdagi bo'limga
qarang). Shundan keyin GitHub'ning o'z manzili ishlaydi va u
**hech qachon o'zgarmaydi**.

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

| Yo'l                                               | Nima bo'ladi                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gh codespace ports visibility 3000:public`        | `404 Not Found` — `--codespace` nomi berilmasa va server ishlamasa xato beradi. `npm run share` ikkalasini ham to'g'ri bajaradi                                                                                                                                                                                                                                         |
| `gh codespace ports forward 3000:3000`             | `ssh: unexpected packet` — Termux'da SSH kanali ochilmaydi                                                                                                                                                                                                                                                                                                              |
| `.devcontainer/devcontainer.json` + `forwardPorts` | **Codespace umuman ishga tushmay qoladi.** GitHub standart sozlamasida Docker allaqachon bor; o'z faylimizda `docker-in-docker` qo'shilsa ikkalasi to'qnashadi va `failed to start vs code remote server` xatosi chiqadi. Shu sababli loyihada devcontainer fayli **yo'q**                                                                                              |
| Saqlangan PID'ni tekshirmasdan `kill` qilish       | **Begona jarayon o'ladi.** Operatsion tizim PID raqamlarini qayta ishlatadi: codespace qayta ishga tushgach eski PID boshqa jarayonga tegishli bo'ladi. Shu sabab `npm run go` bir marta o'zini to'xtatib qo'ygan (`Terminated`). Endi `scripts/lib/tunnel.mjs` PID'ni o'ldirishdan oldin `/proc/<pid>/cmdline` orqali uning haqiqatan `cloudflared` ekanini tekshiradi |

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

### Qayta ulanish uchun qisqa buyruq

Aloqa uzilgani telefonda tez-tez takrorlanadi, `gh codespace ssh` ni har
safar yozish esa kichik klaviaturada zerikarli. Termux'da **bir marta**
bajaring:

```bash
cat > $PREFIX/bin/nav <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
exec gh codespace ssh
EOF
chmod +x $PREFIX/bin/nav
```

Shundan keyin qayta ulanish uchun bitta so'z yetarli:

```bash
nav
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

## AI Yordamchi

Foydalanuvchi oddiy tilda yozadi, yordamchi buyruqni tayyorlaydi:

```
👤 gazga to'la
🤖 Hududgaz uchun shaxsiy hisob raqamini yozing (masalan 1234567890).
👤 1234567890
🤖 Hududgaz uchun qancha to'laymiz?
👤 30 ming
🤖 Hududgaz — 1234567890 hisobiga 30 000 so'm to'laymizmi?   [Tasdiqlash]
```

Hammasi bitta jumlada ham bo'ladi: `gazga 1234567890 hisobiga 45 ming to'la`.

### Ovqat buyurtmasi

12-bosqichda yordamchi ovqat moduliga ulandi — endi buyurtmani suhbat
ichida berish mumkin:

```
👤 och qoldim
🤖 Hozir ochiq restoranlar:
   • Non & Kofe — Shirinlik, 25 daqiqa, eng kam 30 000 so'm
   • Milliy Taomlar — Milliy, 45 daqiqa, eng kam 40 000 so'm
   Nima yegingiz kelyapti? Taom nomini yozing.

👤 2 ta lag'mon buyur
🤖 Milliy Taomlar — 2 ta "Lag'mon". Buyurtma beramizmi?
   94 000 so'm · Taomlar 84 000 · Yetkazish 10 000    [Tasdiqlash]
```

Bir nechta restoranda bir xil taom bo'lsa, ro'yxat ko'rsatiladi va
bitta bosishda tanlanadi:

```
👤 kabob buyur
🤖 4 ta variant topildi. Qaysi birini buyuraman?
   [1. Jigar kabob — Choyxona Navruz · 34 000 so'm]
   [2. Tovuq kabob — Choyxona Navruz · 36 000 so'm]
```

Yordamchi tasdiqlashdan OLDIN to'rt narsani tekshiradi va muammoni
o'zi tushuntiradi: restoran ochiqmi, taom mavjudmi, eng kam buyurtma
summasiga yetadimi (yetmasa — "kamida 7 ta olsangiz bo'ladi") va
hamyonda pul bormi.

"Buyurtmam qayerda?" degan savolga holat va taxminiy vaqt bilan
javob beradi.

### Nima uchun til modeli (LLM) emas

LLM kuchli, lekin pul bilan ishlaydigan buyruqda uchta jiddiy kamchiligi
bor: pullik API kaliti kerak, har javob 1-3 soniya kutadi va eng yomoni —
ba'zan "o'ylab topadi" (hallucination). Noto'g'ri summa yoki noto'g'ri
raqam esa qaytarib bo'lmaydigan xato demak.

Shuning uchun `src/modules/assistant/intent.ts` da ANIQ qoidalar
ishlatiladi: natija har doim bir xil, bepul va internetsiz ham ishlaydi.
Til modeli keyinchalik FAQAT tushunilmagan matnlar uchun qo'shiladi —
oqimning qolgan qismi o'zgarmaydi.

### Apostrof muammosi — o'zbek tiliga xos

Bazada `Lag'mon`, odam esa `lagmon` deb yozadi. Klaviatura turlicha:
`Lag'mon`, `Lagʻmon`, `Lag\`mon`, `Lagmon` — hammasi bir xil taom.
To'g'ridan-to'g'ri solishtirilsa hech qachon topilmaydi.

Yechim: `toSearchText()` (`src/lib/search.ts`) ikkala tomonni ham bitta
ko'rinishga keltiradi. Baza tomonida natija `searchName` ustuniga
yozilib, indekslanadi — qidiruv tez va bir xil ishlaydi.

Qidiruv so'z BOSHIDAN solishtiriladi: "burger" so'zi "Burgerlar"
bo'limini topadi, lekin "osh" so'zi "kartOSHka" ni topmaydi. O'zbek
tilida qo'shimchalar so'z oxiriga qo'shilgani uchun bu tabiiy ishlaydi.

### Uchta xavfsizlik qoidasi

1. **Yordamchi pulni o'zi harakatlantirmaydi.** U faqat buyruq tayyorlaydi;
   foydalanuvchi tugmani bosgach, mijoz odatdagi endpointga murojaat qiladi.
   Shunda balans, chegara va takroriy so'rov tekshiruvlari o'z joyida
   ishlaydi va ularni chetlab o'tib bo'lmaydi. Ovqat buyurtmasi ham
   xuddi shu yo'ldan — `POST /api/v1/food/orders` — o'tadi.
2. **Tasdiqlashda aniq summa va qabul qiluvchi katta yozilgan** — bosishdan
   oldin nima bo'layotgani ko'rinib turadi. Ovqatda manzil ham to'liq
   yoziladi: ovqat qayerga borishini bilish shart.
3. **Telefon raqami summa deb o'qilmaydi.** "901234567 ga 50000 yubor"
   buyrug'ida 901 234 567 so'm o'tkazilishi mumkin edi — raqam summadan
   oldin ajratiladi va test buni doimiy tekshiradi. Xuddi shunday,
   "2 ta lag'mon" dagi 2 — bu dona, summa emas.

Suhbat holati mijozda saqlanadi (server holatsiz). Holatni tahrirlab
arzonga ovqat olib bo'lmaydi: narx buyurtma yaratilganda bazadan
qaytadan o'qiladi. `assistant.schemas.test.ts` esa holatning har bir
maydoni API sxemasidan o'tishini tekshiradi — bu haqiqiy xatodan
keyin qo'shilgan qo'riqchi.

---

## Admin panel

Manzil: `/admin`. Ilova ichida esa **Profil → Admin panel** (havola faqat
ruxsati borlarga ko'rinadi).

### Nima uchun kerak edi

7-bosqichgacha yangi provayder qo'shish yoki tarifni o'zgartirish uchun
`src/config/service-providers.ts` faylini tahrirlab, ilovani qayta
chiqarish kerak edi. Real ishda bu ishlamaydi: "Beeline chegarani
o'zgartirdi" degan xabar kelganda hech kim dasturchini kutib o'tirmaydi.

### Beshta bo'lim

| Bo'lim    | Nima qiladi                                                            |
| --------- | ---------------------------------------------------------------------- |
| Asosiy    | Foydalanuvchilar, hamyonlardagi umumiy qoldiq, kunlik va haftalik hajm |
| Xizmatlar | Provayder qo'shish, tahrirlash, o'chirish (yumshoq)                    |
| To'lovlar | Chek yoki telefon bo'yicha qidirish va **pulni qaytarish**             |
| Odamlar   | Qidirish, batafsil ko'rish, bloklash, **rol berish**                   |
| Jurnal    | Audit — kim, qachon, nima qildi                                        |

Hamyon tranzaksiyalari (butun daftar) pastki panelda emas — u kundalik
ish emas, "Asosiy" sahifadagi karta orqali ochiladi. Telefonda beshtadan
ortiq bo'limni barmoq bilan aniq bosish qiyin.

### Birinchi adminni qanday yaratish

Tovuq va tuxum muammosi: admin panelda rol berish mumkin, lekin panelga
kirish uchun allaqachon ADMIN roli kerak. Shuning uchun birinchi admin
terminaldan tayinlanadi:

```bash
npm run role:grant -- 901234567              # ADMIN qiladi
npm run role:grant -- 901234567 SUPER_ADMIN  # bosh admin
npm run role:grant -- 901234567 ADMIN remove # rolni olib tashlaydi
```

Rol berilgandan keyin **ilovadan chiqib, qaytadan kiring** — rollar kirish
tokeni (JWT) ichida saqlanadi va eski token hali eski rollarni ko'rsatadi.

### Uchta xavfsizlik qoidasi

**1. Admin balansni qo'lda o'zgartira olmaydi.** "Balansga 50 000 qo'sh"
kabi funksiya ataylab yozilmagan. Qo'lda o'zgartirilgan balans
buxgalteriya daftari (`wallet_transactions`) bilan mos kelmay qoladi va
hisobni tekshirib bo'lmaydi. Pulni qaytarish esa mumkin, lekin u har
doim aniq bir TO'LOVGA bog'lanadi va daftarga `REFUND` yozuvi tushadi —
ya'ni hisob baribir birlashadi.

**2. Bloklanganda sessiyalar darhol bekor qilinadi.** Bu eng oson
unutiladigan joy: rollar va kirish huquqi JWT ichida, JWT esa 15 daqiqa
yashaydi. Sessiya bekor qilinmasa, bloklangan odam yana 15 daqiqa
ishlayverardi — pul o'tkazishga yetadi.

**3. Admin o'zini ham, boshqa adminni ham bloklay olmaydi.** Birinchisi
oxirgi adminni tasodifan yo'qotishdan saqlaydi, ikkinchisi ikki admin
o'rtasidagi "urush"ning oldini oladi. Adminni faqat `SUPER_ADMIN`
bloklay oladi.

Har bir admin amali audit jurnaliga yoziladi: kim, qachon, nimani
o'zgartirdi va nima sababdan.

### Hisob raqami naqshi — eng nozik joy

Provayder qo'shishda "tekshirish naqshi" (regex) so'raladi. Bu — admin
yozadigan, lekin **serverda bajariladigan** satr. Ikkita jiddiy xavf bor:

- **ReDoS.** `^(\d+)+$` kabi naqsh 29 belgilik noto'g'ri satrda **11
  soniya** ishlaydi (o'lchab ko'rildi) va uzunlik oshgani sari
  eksponensial o'sadi. Node bir oqimli — bitta bunday so'rov butun
  serverni to'xtatadi.
- **Juda keng naqsh.** Langarsiz `\d{10}` naqshi `salom1234567890salom`
  ni ham qabul qiladi, ya'ni pul mavjud bo'lmagan hisobga ketishi mumkin.

Yechim — `src/modules/admin/account-regex.ts`: faqat sanab o'tilgan
sintaksisga ruxsat beriladi. Eng muhimi, **qavs `(` `)` umuman
taqiqlangan** — halokatli qaytish uchun ichida takrorlagichi bor guruh
kerak, guruh bo'lmasa bunday naqshni yozib bo'lmaydi.

Formada uchta yordam bor: tayyor qoliplar (tugma bosiladi), jonli sinov
maydoni (namunaviy raqam kiritiladi va darhol ✓/✗ ko'rinadi) va
xavfsizlik tekshiruvi.

### Pulni qaytarish (refund)

**To'lovlar** bo'limida har bir bajarilgan to'lov yonida "Qaytarish"
tugmasi bor. Bosilganda oyna ochiladi: summa, xizmat, hisob raqami,
chek va mijoz ko'rsatiladi, **sabab esa majburiy** — u audit jurnaliga
yoziladi.

Qaytarilganda:

1. mijoz hamyoniga `REFUND` tranzaksiyasi qo'shiladi (yo'nalish — kirim);
2. to'lov holati `REFUNDED` bo'ladi;
3. kim, qachon va nima uchun qaytargani saqlanadi;
4. mijozga bildirishnoma yuboriladi.

Ikkalasi — pul va holat — **bitta tranzaksiyada** bajariladi. Aks holda
pul qaytib, to'lov holati eski qolib ketishi mumkin edi.

**Ikki marta qaytarib bo'lmaydi, hatto ikki xodim bir vaqtda bossa ham.**
Idempotentlik kaliti mijozdan olinmaydi — u to'lov ID'sidan hisoblanadi
(`refund-{paymentId}`), ustun esa bazada `UNIQUE`. Ya'ni himoya kodda
emas, **bazada**. Sinovda 5 ta bir vaqtdagi so'rovdan aynan bittasi
o'tdi, balans esa aynan bir marta oshdi.

### Rol berish

**Odamlar → foydalanuvchi → Rollar**. Faqat `SUPER_ADMIN` uchun: bu
ruxsatga ega odam istalgan hisobga istalgan huquqni bera oladi.

Uchta himoya:

- **o'z rollaringizni o'zgartira olmaysiz** — aks holda o'zingizdan bosh
  administrator huquqini olib tashlab, tizimni boshqaruvsiz
  qoldirishingiz mumkin edi;
- **oxirgi bosh administratorni olib tashlab bo'lmaydi** — tekshiruv
  tranzaksiya ichida bajariladi, shuning uchun ikki xodim bir vaqtda ham
  buni qila olmaydi;
- **rol o'zgargach barcha sessiyalar bekor qilinadi** — rollar JWT
  ichida, aks holda olib tashlangan rol yana 15 daqiqa ishlayverardi.

### Audit jurnali

**Jurnal** bo'limi — nizolarni hal qilishning yagona ishonchli manbai.
Yozuvlar o'zgarmas: tahrirlash yoki o'chirish tugmasi yo'q va bo'lmaydi
ham.

Filtrlar: **Pul** (to'ldirish, o'tkazma, to'lov, qaytarish), **Admin**
(xizmat, holat, rol o'zgarishlari), **Kirish**. Qidiruv telefon raqami
yoki obyekt ID bo'yicha ishlaydi. Har yozuvda eng muhim tafsilot bir
qatorda chiqadi: summa, chek raqami, sabab, rol.

> **Nima uchun token yangilash jurnalga yozilmaydi.** Token har
> 14 daqiqada yangilanadi — har safar yozuv qoldirilsa, 100 000
> foydalanuvchida kuniga millionlab qator paydo bo'lardi va haqiqiy
> hodisalar ular orasida ko'rinmay ketardi. Qurilma faolligi
> `sessions.lastUsedAt` da saqlanadi, ya'ni ma'lumot yo'qolmaydi.

### Kod nima uchun o'zgarmaydi

Provayder kodi (`hududgaz`) yaratilgandan keyin tahrirlanmaydi: u
`npm run db:seed` uchun kalit. Kod o'zgarsa keyingi seed eski nomdagi
provayderni qayta yaratardi va ro'yxatda ikkita bir xil xizmat paydo
bo'lardi.

Xuddi shu sababdan **o'chirish endpointi yo'q** — faqat `isActive: false`.
Provayder o'chirilsa unga bog'langan to'lovlar tarixi buzilardi.

---

## Doimiy manzil — Vercel'ga chiqarish

Ishlab chiqishda `npm run share` har safar YANGI havola beradi
(`tasodifiy-nom.trycloudflare.com`). Bu vaqtinchalik tunnelning tabiati,
sozlama bilan tuzatib bo'lmaydi.

Doimiy manzil uchun ilova **Vercel**'ga chiqariladi. Shundan keyin:

- havola bir marta beriladi va **hech qachon o'zgarmaydi**;
- codespace uxlab qolsa ham sayt ishlab turaveradi;
- `git push` qilsangiz — sayt o'zi yangilanadi.

### Nima kerak (hammasi bepul)

| Xizmat                         | Nima uchun        | Bepul chegara           |
| ------------------------------ | ----------------- | ----------------------- |
| [Vercel](https://vercel.com)   | Ilovaning o'zi    | Shaxsiy loyihalar uchun |
| [Neon](https://neon.tech)      | PostgreSQL bazasi | 0.5 GB                  |
| [Upstash](https://upstash.com) | Redis             | Kuniga 10 000 buyruq    |

Uchalasiga ham GitHub hisobingiz bilan kirasiz — alohida parol o'ylash
shart emas.

### 1-qadam. Baza (Neon)

1. [neon.tech](https://neon.tech) → **Sign up with GitHub**
2. **Create project** → nomi `navix`, region **Europe (Frankfurt)**
3. **Connection string** bandidagi manzilni **Copy snippet** tugmasi
   bilan nusxalang — bu `DATABASE_URL` bo'ladi

Ikkinchi manzil (`DIRECT_URL`) ni qidirib o'tirish shart emas:
`npm run deploy:check` uni o'zi topib, ulanib ko'rib, tayyor qatorni
ekranga chiqaradi. Ikkalasi faqat bitta so'z bilan farq qiladi
(`-pooler`), telefonda esa ularni chalkashtirib yuborish juda oson.

> **Nima uchun ikkita.** Vercel serverless ishlaydi: har so'rov alohida
> ko'tariladi. Har biri bazaga to'g'ridan-to'g'ri ulansa, ulanishlar soni
> tez orada tugaydi. "Pooled" manzil ularni birlashtiradi.
>
> Lekin migratsiya "pooled" orqali ishonchli bajarilmaydi — u jadval
> qulflarini ishlatadi, birlashtiruvchi esa ularni yo'qotadi. Shuning
> uchun migratsiyaga alohida "direct" manzil kerak.

### 2-qadam. Redis (Upstash)

1. [upstash.com](https://upstash.com) → **Sign up with GitHub**
2. **Create Database** → nomi `navix`, region **eu-central-1**
3. **Redis Connect** → `ioredis` bandidagi manzilni nusxalang
   (`rediss://` bilan boshlanadi)

### 3-qadam. Sozlamalarni yozish

```bash
cd /workspaces/Navix
npm run update
npm run env:setup
```

> `npm run update` — oddiy `git pull` o'rniga. U `package-lock.json`
> tufayli chiqadigan "Your local changes would be overwritten" xatosini
> o'zi hal qiladi va kutubxonalarni ham o'rnatadi.

Skript ketma-ket ikkita manzilni so'raydi — Neon va Upstash. Har birini
nusxalab tashlaysiz, xolos.

**Nusxalashda ortiqcha belgi qo'shilib ketsa xavotir olmang.** Skript
ularni o'zi tozalaydi:

```
<postgresql://...>              → qavslar olib tashlanadi
REDIS_URL="rediss://..."        → nomi olib tashlanadi
"  rediss://...  "              → qo'shtirnoq va probellar olib tashlanadi
```

Manzil noto'g'ri bo'lsa (masalan Upstash'ning REST manzili) — darhol
aytadi va qaytadan so'raydi.

**JWT kalitlarini o'zingiz yozmaysiz** — skript ularni o'zi yaratadi.
`DIRECT_URL` ham avtomatik hosil qilinadi.

Natijada `.env.production` fayli paydo bo'ladi. U Git'ga tushmaydi va
uni faqat siz o'qiy olasiz.

> **Kalitlarni hech kimga yubormang.** Parol yoki token boshqa odamning
> qo'liga tushsa — u bazangizga to'g'ridan-to'g'ri kira oladi. Xato
> chiqsa faqat XATO MATNINI ko'rsating, faylning o'zini emas.

Endi tekshiring:

```bash
npm run deploy:check
```

Bu buyruq bazaga ham, Redis'ga ham HAQIQATAN ulanib ko'radi va nima
xato ekanini o'zbekcha aytadi. Vercel'da xato chiqqanidan ko'ra, shu
yerda topgan ancha oson.

### 4-qadam. Bazani tayyorlash

```bash
npm run deploy:db
```

Bu buyruq bulutdagi bazada jadvallarni yaratadi va boshlang'ich
ma'lumotlarni (rollar, ruxsatlar, xizmat provayderlari, restoranlar)
yozadi.

Bajarishdan oldin **qaysi bazaga yozayotganini ekranda ko'rsatadi** —
lokal bazani adashib o'zgartirib qo'yish mumkin emas.

### 5-qadam. Vercel

1. [vercel.com/new](https://vercel.com/new) → **Continue with GitHub**
2. `Navix` omborini tanlang → **Import**
3. **Environment Variables** bo'limini oching. Terminalda:

   ```bash
   npm run deploy:vars
   ```

   Chiqqan matnni to'liq nusxalab, birinchi katakka tashlang — Vercel
   uni o'zi qatorlarga ajratadi. `NODE_ENV` qo'shilmaydi: uni Vercel
   o'zi qo'yadi.

4. **Deploy** tugmasini bosing

2-3 daqiqada tayyor bo'ladi va manzil beriladi.

**Manzil ma'lum bo'lgach:** Vercel → Settings → Environment Variables →
`NEXT_PUBLIC_APP_URL` ni haqiqiy manzilga o'zgartiring va qaytadan
deploy qiling (Deployments → oxirgisi → Redeploy).

### Shundan keyin ishlash tartibi

```bash
git add -A
git commit -m "..."
git push
```

Vercel o'zi ko'radi va 2-3 daqiqada saytni yangilaydi. **Manzil
o'zgarmaydi.**

### Uchta muhim ogohlantirish

**1. SMS hali ulanmagan.** `SMS_PROVIDER=console` bo'lgani uchun
tasdiqlash kodi SMS orqali yuborilmaydi — u Vercel loglarida ko'rinadi
(Deployments → Functions → Logs). Ya'ni saytga faqat **siz** kira
olasiz. Haqiqiy foydalanuvchilar uchun [eskiz.uz](https://eskiz.uz)
hisobi kerak (pullik).

**2. Vercel bepul rejasi tijorat uchun emas.** Sayt pul topa boshlasa,
Vercel qoidasi bo'yicha **Pro** rejaga o'tish kerak (oyiga $20).
Hozircha — namoyish va sinov uchun bepul reja yetarli.

**3. Lokal baza va bulutdagi baza — ALOHIDA.** Codespace'dagi
ma'lumotlar saytda ko'rinmaydi va aksincha. Yangi migratsiya yozsangiz,
uni bulutdagi bazaga ham qo'llash kerak:

```bash
npm run deploy:db
```

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
│   │   ├── wallet/          # Hamyon: balans, to'ldirish, o'tkazma
│   │   ├── payment/         # Xizmat to'lovlari (kommunal, internet...)
│   │   ├── notification/    # Bildirishnomalar
│   │   ├── assistant/       # AI Yordamchi (niyat tahlili, slot to'ldirish, ovqat oqimi)
│   │   ├── food/            # Ovqat yetkazish (restoran, menyu, buyurtma)
│   │   ├── merchant/        # Restoran kabineti (buyurtma holati, menyu)
│   │   └── admin/           # Admin panel (xizmatlar, foydalanuvchilar)
│   ├── config/
│   │   ├── modules.ts       # SUPER APP MODULLAR REYESTRI
│   │   ├── rbac.ts          # Rollar va ruxsatlar
│   │   ├── service-providers.ts # To'lov xizmatlari (seed manbasi)
│   │   ├── restaurants.ts   # Restoranlar va menyu (seed manbasi)
│   │   ├── app-nav.ts       # Ilova navigatsiyasi
│   │   ├── admin-nav.ts     # Admin panel navigatsiyasi
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
│       ├── search.ts        # Qidiruv normalizatsiyasi (apostrof muammosi)
│       └── utils.ts         # Yordamchi funksiyalar
├── scripts/                 # Yordamchi skriptlar (share, url, otp, dev:stop)
│   ├── grant-role.ts        # Foydalanuvchiga rol berish (birinchi admin)
│   ├── assign-restaurant.ts # Restoranni egasiga biriktirish
│   ├── update.mjs           # Kodni xavfsiz yangilash
│   ├── env-setup.mjs        # Production sozlamalarini yozish
│   ├── deploy-check.mjs     # Production tayyorligini tekshirish
│   ├── deploy-db.mjs        # Bulutdagi bazani tayyorlash
│   ├── deploy-vars.mjs      # Vercel o'zgaruvchilarini chiqarish
│   └── lib/tunnel.mjs       # Ommaviy havola (Cloudflare tunneli)
├── vercel.json              # Vercel sozlamalari (region, funksiya muddati)
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

**Admin** (`/api/v1/admin/...`) — har biri alohida ruxsat talab qiladi

| Metod | Manzil                  | Tavsif                              | Kerakli ruxsat               |
| ----- | ----------------------- | ----------------------------------- | ---------------------------- |
| GET   | `/stats`                | Platforma ko'rsatkichlari           | `platform:admin:access`      |
| GET   | `/providers`            | Barcha xizmatlar (o'chirilgani ham) | `platform:admin:access`      |
| POST  | `/providers`            | Yangi xizmat qo'shish               | `platform:provider:manage`   |
| GET   | `/providers/{id}`       | Bitta xizmat                        | `platform:admin:access`      |
| PATCH | `/providers/{id}`       | Xizmatni tahrirlash                 | `platform:provider:manage`   |
| GET   | `/users`                | Foydalanuvchilar ro'yxati           | `platform:user:read`         |
| GET   | `/users/{id}`           | Foydalanuvchi haqida batafsil       | `platform:user:read`         |
| PATCH | `/users/{id}`           | Holatni o'zgartirish (bloklash)     | `platform:user:suspend`      |
| PATCH | `/users/{id}/roles`     | Rol berish yoki olib tashlash       | `platform:role:manage`       |
| GET   | `/transactions`         | Barcha hamyon amallari              | `platform:transaction:read`  |
| GET   | `/payments`             | Barcha xizmat to'lovlari            | `platform:transaction:read`  |
| POST  | `/payments/{id}/refund` | Pulni mijozga qaytarish             | `payment:transaction:refund` |
| GET   | `/audit`                | Audit jurnali                       | `platform:audit:read`        |

**Ovqat yetkazish** (`/api/v1/food/...`)

| Metod | Manzil                | Tavsif                               |
| ----- | --------------------- | ------------------------------------ |
| GET   | `/restaurants`        | Restoranlar (toifa va qidiruv bilan) |
| GET   | `/restaurants/{slug}` | Restoran va uning menyusi            |
| GET   | `/orders`             | Mening buyurtmalarim                 |
| POST  | `/orders`             | Buyurtma berish                      |
| GET   | `/orders/{id}`        | Bitta buyurtma                       |
| POST  | `/orders/{id}/cancel` | Bekor qilish va pulni qaytarish      |

**Restoran kabineti** (`/api/v1/merchant/...`)

| Metod | Manzil                   | Tavsif                                  |
| ----- | ------------------------ | --------------------------------------- |
| GET   | `/restaurants`           | Mening restoranlarim va ko'rsatkichlar  |
| PATCH | `/restaurants/{id}`      | Ochish/yopish, yetkazish vaqti          |
| GET   | `/restaurants/{id}/menu` | Restoran menyusi                        |
| PATCH | `/menu-items/{id}`       | Taom mavjudligi yoki narxi              |
| GET   | `/orders`                | Kelgan buyurtmalar (standart — faollar) |
| GET   | `/orders/{id}`           | Bitta buyurtma                          |
| PATCH | `/orders/{id}`           | Holatni o'zgartirish yoki rad etish     |

---

## Ovqat yetkazish

Manzil: `/food`. Bosh sahifadagi "Ovqat" kartochkasi ham shu yerga
olib boradi.

Oqim: **restoranlar → menyu → savat → manzil → buyurtma → kuzatish**.

### Ikkita asosiy qoida

**1. Narx HAR DOIM bazadan olinadi.** Savat serverga faqat "qaysi taom,
nechta" yuboradi — narx emas. Summa, yetkazish haqi va jami serverda
qayta hisoblanadi.

Aks holda so'rovni tahrirlab 55 000 so'mlik pitsani 1 so'mga "sotib
olish" mumkin bo'lardi. `createFoodOrderSchema` da narx maydoni umuman
yo'q va buni test doimiy tekshiradi.

**2. Buyurtma — o'zgarmas nusxa.** Taom nomi va narxi buyurtma qatoriga
KO'CHIRILADI, havola bilan bog'lanmaydi. Restoran ertaga narxni oshirsa
yoki taomni menyudan olib tashlasa, eski chek o'zgarmasligi kerak —
aks holda foydalanuvchi "men boshqa narx to'lagandim" desa, biz isbotlay
olmasdik.

Xuddi shu sabab manzil ham MATN sifatida saqlanadi: foydalanuvchi
manzilni o'chirsa, eski buyurtma "qayerga yetkazilgan?" degan savolga
javob bera olishi kerak.

### Savat nima uchun brauzerda

Savat — vaqtinchalik ro'yxat, moliyaviy hujjat emas. Uni bazada saqlash
har bir "+" bosishda so'rov yuborishni talab qilardi: mobil internetda
sekin va trafik sarflaydi.

Bu xavfsiz, chunki savatda faqat ID va son turadi. Foydalanuvchi
`localStorage` ni tahrirlasa, eng yomoni — o'z savatini buzadi.

Bitta savatda faqat BITTA restoran bo'ladi: har birining o'z kuryeri va
yetkazish haqi bor. Boshqa restoran tanlanganda savat jimgina
tozalanmaydi — tasdiqlash so'raladi.

### Bekor qilish va pul qaytishi

Buyurtmani **oshxona tayyorlashni boshlagunicha** bekor qilish mumkin —
pul to'liq qaytariladi. Undan keyin mahsulot sarflangan bo'ladi va
bekor qilish restoranga zarar keltiradi.

Qaytarish 9-bosqichdagi `refundWallet()` ni ishlatadi va xuddi
shunday himoyalangan: idempotentlik kaliti buyurtma ID'sidan
hisoblanadi (`food-refund-{orderId}`), ustun esa bazada `UNIQUE`.
Sinovda 5 ta bir vaqtdagi so'rovdan aynan bittasi o'tdi.

### Buyurtma holatlari

`PENDING → CONFIRMED → PREPARING → DELIVERING → DELIVERED`
(`CANCELLED` — alohida yakuniy holat).

Hozircha to'lov o'tishi bilan buyurtma `CONFIRMED` bo'ladi. Keyingi
bosqichlarni restoran o'zgartiradi — buning uchun **restoran kabineti**
kerak (11-bosqich).

### Restoranlar qayerdan keladi

`src/config/restaurants.ts` — boshlang'ich ro'yxat (6 ta restoran,
50 ta taom). `npm run db:seed` uni bazaga yozadi. Ishlash paytida
hammasi bazadan o'qiladi.

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
- [x] **4-bosqich** — Hamyon: balans, to'ldirish, o'tkazma, amallar tarixi
- [x] **5-bosqich** — To'lovlar: 14 ta provayder, saqlangan hisoblar, cheklar
- [x] **6-bosqich** — Bildirishnomalar: hodisalar katalogi, o'qilmaganlar
- [x] **7-bosqich** — AI Yordamchi: niyatni tushunish va buyruq tayyorlash
- [x] **8-bosqich** — Admin panel: xizmatlar, foydalanuvchilar, tranzaksiyalar, statistika
- [x] **9-bosqich** — Pulni qaytarish, rol boshqaruvi, audit jurnali
- [x] **10-bosqich** — Ovqat yetkazish: restoranlar, menyu, savat, buyurtma
- [x] **11-bosqich** — Restoran kabineti: buyurtma holatini boshqarish
- [x] **12-bosqich** — AI Yordamchiga ovqat modulini ulash: suhbat ichida buyurtma, holat savoli
- [x] **13-bosqich** — Doimiy manzil: Vercel'ga chiqarish (Neon + Upstash)
- [ ] **14-bosqich** — Taksi moduli (xarita API kaliti kerak)
- [ ] **15-bosqich** — Real to'lov integratsiyasi (Payme / Click)

# Navix — Markaziy Osiyo uchun AI Super App

Taksi, ovqat yetkazish, marketplace, to'lovlar, hamyon, ish qidirish, kuryer,
posilka, mehmonxona, sayohat, chat va AI yordamchi — barchasi bitta platformada.

> **Holat:** 22-bosqich yakunlandi.
>
> Tayyor: poydevor, autentifikatsiya, shaxsiy kabinet, **hamyon**
> (balans, to'ldirish, o'tkazma, tarix), **to'lovlar** (kommunal,
> internet, mobil aloqa, TV — 14 ta provayder, saqlangan hisoblar, chek),
> **bildirishnomalar**, **admin panel** (xizmatlar, foydalanuvchilar,
> pulni qaytarish, audit jurnali), **ovqat yetkazish** — restoranlar,
> menyu, savat, buyurtma, bekor qilish, **restoran kabineti**
> (buyurtma holatini boshqarish) va **AI Yordamchi** — oddiy tilda
> yozilgan buyruqni tushunib to'lov, o'tkazma, **ovqat buyurtmasi va
> Marketplace xaridini** tayyorlaydi, **Marketplace** — do'konlar,
> toifalar, mahsulot qidiruvi, savat va zaxira nazorati, **sotuvchi
> kabineti** — do'kon egasi mahsulot qo'shadi, omborni yuritadi va
> buyurtmalarni o'zi boshqaradi, **kuryer moduli** — yetkazish
> topshirig'i, umumiy ro'yxatdan ish olish va avtomatik haq, **ovoz
> bilan boshqarish** va yangi foydalanuvchi uchun **tanishtiruv**, hamda
> **ish qidirish** — vakansiyalar katalogi, qidiruv va filtrlar, ariza
> yuborish va arizalar tarixi, hamda **ish beruvchi kabineti** — kompaniya
> vakansiya joylaydi, nomzodlarni ko'rib chiqadi va suhbatga taklif
> qiladi, hamda **yetkazib berish** — viloyatlararo posilka jo'natish,
> jonli narx hisobi va kuzatuv, hamda **mehmonxona** — xonalarni
> sana bo'yicha band qilish, bo'sh joy nazorati va bekor qilish.
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

| Buyruq                      | Nima qiladi                                                        |
| --------------------------- | ------------------------------------------------------------------ |
| `npm run dev`               | Ishlab chiqish serverini ishga tushiradi                           |
| `npm run go`                | Baza + Redis + serverni birdan ishga tushiradi                     |
| `npm run status`            | Server, baza, Redis va jadvallar mosligini tekshiradi              |
| `npm run update`            | Kodni xavfsiz yangilaydi (git pull + npm install)                  |
| `npm run dev:bg`            | Serverni FONDA ishga tushiradi (terminal boʻsh qoladi)             |
| `npm run dev:stop`          | Fondagi serverni toʻxtatadi                                        |
| `npm run dev:log`           | Server logini jonli koʻrsatadi                                     |
| `npm run share`             | Vaqtinchalik havola ochadi (har safar yangi — sinov uchun)         |
| `npm run url`               | Ochiq havolani qayta chiqaradi (yangisini ochmaydi)                |
| `npm run env:setup`         | Production sozlamalarini savol-javob bilan yozadi                  |
| `npm run deploy:check`      | Production tayyorligini tekshiradi (baza, Redis, kalitlar)         |
| `npm run money:check`       | Hamyon balanslari tarixga mos kelishini tekshiradi (`--prod` ham)  |
| `npm run deploy:db`         | Bulutdagi bazaga migratsiya va boshlang'ich ma'lumotlarni yozadi   |
| `npm run deploy:vars`       | Vercel o'zgaruvchilarini ekranga chiqaradi (qo'lda kiritish uchun) |
| `npm run deploy:push-env`   | O'zgaruvchilarni Vercel'ga terminaldan yuboradi                    |
| `npm run otp`               | Oxirgi SMS kodini topadi (lokal). Internet uchun: `-- --prod`      |
| `npm run role:grant`        | Foydalanuvchiga rol beradi (bulut uchun: `--prod`)                 |
| `npm run restaurant:assign` | Restoranni egasiga biriktiradi (MERCHANT roli bilan)               |
| `npm run shop:assign`       | Marketplace do'konini egasiga biriktiradi (MERCHANT roli bilan)    |
| `npm run courier:assign`    | Foydalanuvchiga KURYER rolini beradi                               |
| `npm run company:assign`    | Kompaniyani egasiga biriktiradi (EMPLOYER roli bilan)              |
| `npm run build`             | Production uchun yig'adi                                           |
| `npm run start`             | Yig'ilgan ilovani ishga tushiradi                                  |
| `npm run verify`            | Turlar + lint + testlar — hammasini birdan tekshiradi              |
| `npm run typecheck`         | TypeScript xatolarini tekshiradi                                   |
| `npm run lint`              | Kod uslubini tekshiradi                                            |
| `npm run test`              | Testlarni bir marta ishga tushiradi                                |
| `npm run test:watch`        | Testlarni kuzatuv rejimida ishlatadi                               |
| `npm run format`            | Kodni avtomatik formatlaydi                                        |
| `npm run db:generate`       | Prisma klientini sxemadan yaratadi (dev/build o'zi ham chaqiradi)  |
| `npm run db:studio`         | Bazani brauzerda ko'rish oynasini ochadi                           |
| `npm run db:migrate`        | Yangi migratsiya yaratadi va qo'llaydi                             |
| `npm run db:seed`           | Boshlang'ich ma'lumotlarni yozadi                                  |
| `npm run docker:up`         | PostgreSQL va Redis'ni ko'taradi                                   |
| `npm run docker:down`       | Konteynerlarni to'xtatadi                                          |

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

### Admin panel (yoki boshqa kabinet) havolasi ko'rinmasa

Profil sahifasida "Admin panel" havolasi yo'q, `/admin` ni qo'lda
ochsangiz "Bu bo'lim siz uchun yopiq" deydi.

**Sabab deyarli har doim bitta: o'sha bazada rol berilmagan.**

Rollar `user_role_assignments` jadvalida saqlanadi va u **har bazada
alohida**. Lokal bazada admin qilingan odam Neon'dagi bazada oddiy
foydalanuvchi bo'lib qolaveradi — kod esa ikkalasida bir xil.

Tekshirish va tuzatish:

```bash
npm run role:grant -- <telefon> ADMIN          # lokal baza
npm run role:grant -- <telefon> ADMIN --prod   # bulutdagi baza
```

Keyin **ilovadan chiqib, qaytadan kiring** — rollar kirish tokeni
ichida saqlanadi.

Havola ko'rinmasligi himoya EMAS: haqiqiy tekshiruv `/api/v1/admin/*`
endpointlarida (`requirePermission`). Havolani yashirish shunchaki
keraksiz tugmani ko'rsatmaslik uchun.

### "Ustun yo'q" yoki "Serverda kutilmagan xatolik" chiqsa

Xato matnida shunga o'xshash gap bo'ladi:

```
The column `sessions.previousTokenHash` does not exist in the current database
```

**Sabab.** `git pull` yangi KODNI olib keladi, lekin BAZANI
o'zgartirmaydi. Kodda yangi ustun paydo bo'lgan, bazada esa hali
yo'q.

**Bu endi o'z-o'zidan tuzaladi.** `npm run go` bazani kodga
moslashtiradi (`npm run db:sync` orqali), Vercel esa har deploy'da
migratsiyani o'zi qo'llaydi.

Agar baribir chiqsa:

```
npm run db:sync     # lokal baza
npm run deploy:db   # bulutdagi baza (Neon)
```

**Nima uchun ilgari avtomatik emasdi.** `npm run status` bu holatni
aniqlardi va nima qilish kerakligini aytardi — lekin uni hech kim
ishlatmaydi: odam `npm run go` yozadi va ishlashini kutadi.
Tekshiruv ESLATMA emas, AMAL bo'lishi kerak ekan.

Production'da esa oqibati og'irroq edi: Vercel yangi kodni chiqarardi,
Neon esa eski holicha qolardi va sayt butunlay ishlamay qolardi. Endi
`vercel.json` dagi `buildCommand` migratsiyani build paytida
qo'llaydi. Migratsiya yiqilsa deploy ham to'xtaydi — bu ATAYLAB:
buzuq saytdan ko'ra chiqmagan deploy yaxshiroq, eski versiya esa
ishlashda davom etadi.

### Sahifa skelet holatida qotib qolsa

Ekranda kulrang to'rtburchaklar turadi, hech narsa yuklanmaydi va
hech qanday xabar ham yo'q.

**Bu xato TUZATILDI.** Endi bunday holatda ilova aniq ekran
ko'rsatadi: *"Serverga ulanib bo'lmadi"* va ikkita tugma. Agar
sizda hali eski versiya bo'lsa, `npm run update` bajaring.

Quyida sabab yozilgan — chunki u ikki xil bo'lgan va ikkalasi ham
bir xil ko'rinardi.

#### 1-sabab: baza yoki server javob bermayapti

Codespace qayta ishga tushganda Docker konteynerlari o'chib qoladi.
Terminalda Prisma xatosi ko'rinadi (`DatabaseNotReachable`, `P1001`).

Ilova esa serverdan javob kutib turaverardi. Javob umuman
kelmaganda `fetch` **abadiy** kutishi mumkin — shuning uchun skelet
hech qachon yo'qolmasdi.

Yechim: `npm run go` — baza, Redis va serverni birdan ko'taradi.

#### 2-sabab: cheksiz aylanish (eng nozigi)

Sessiya bekor qilingan, lekin cookie brauzerda qolgan bo'lsa:

```
brauzer  →  "sessiyam yaroqsiz"  →  /auth/login
proxy    →  "cookie bor-ku!"     →  /dashboard
brauzer  →  "sessiyam yaroqsiz"  →  /auth/login  ...
```

Manzil satri o'zgarib turadi-yu, ekranda doim skelet. Bu holat
baza o'chganda ham yuz berardi: yangilash so'rovi xato qaytarardi,
ilova esa buni "sessiya yo'q" deb tushunardi.

#### To'rt qatlamli yechim

| Qatlam | Nima qiladi |
| ------ | ----------- |
| So'rov muddati | Har bir so'rov eng ko'pi bilan **20 soniya** kutadi, keyin xato beradi. Abadiy kutish endi mumkin emas |
| Holatni ajratish | `refresh()` uch xil javob beradi: `ok`, `guest` (sessiya yo'q), `offline` (serverga yetib bo'lmadi). Faqat `guest` da kirish sahifasiga yuboriladi |
| Cookie tozalash | Server 401 qaytarganda cookie ham o'chiriladi — proxy endi qaytarib urmaydi. Aylanishning ildizi shu yerda uziladi |
| Oxirgi himoya | 15 soniyadan keyin ham skelet tursa, u avtomatik "aloqa yo'q" ekraniga aylanadi |

Aloqa tiklanganda sahifa **o'zi ochiladi**: ilova 3, 6, 12 va 30
soniyada qayta urinib ko'radi (oraliq atayin o'sib boradi — har
soniyada so'rov yuborish qiynalayotgan serverni yanada bo'g'ardi).
Telefon internetga qaytgan zahoti ham darhol tekshiradi.

**Nima uchun bu ilgari qilinmagan?** Birinchi marta sahifa qotib
qolganda sabab BOSHQA edi: brauzer keshidagi eski HTML yo'q bo'lib
ketgan JavaScript fayllarini so'rayotgan edi, ya'ni JavaScript
umuman ishga tushmagan. Unday holatda JavaScript'dagi hech qanday
himoya yordam bermasdi — shuning uchun u safar kesh sozlamasi
tuzatilgan (`src/config/protected-routes.ts`).

Bu safar esa JavaScript ishlayapti, faqat javob kutmoqda. Shuning
uchun endi vaqt chegarasi haqiqatan ham yordam beradi.

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

`SMS_PROVIDER=console` bo'lganda haqiqiy SMS yuborilmaydi — kod server
logiga yoziladi.

**Lokal server:**

```bash
npm run otp
```

**Internetdagi sayt (Vercel):**

```bash
npm run otp -- --prod
```

```
📩 Oxirgi tasdiqlash kodi:

   781769

   Manba: navix-iota.vercel.app
```

> Vercel loglari qisqa muddat saqlanadi. Kod topilmasa — saytda
> "Yangi kod so'rash" tugmasini bosing va darhol buyruqni qaytaring.

**Nima uchun kodni bazadan o'qib bo'lmaydi.** Kod Redis'ga HASH
ko'rinishida yoziladi. Bu ataylab: baza o'g'irlansa ham kodlar foydasiz
bo'ladi. Shuning uchun yagona manba — server logi.

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

### Marketplace xaridi

15-bosqichda yordamchi Marketplace'ga ham ulandi — endi bitta suhbat
ichida ham ovqat, ham mahsulot olish mumkin:

```
👤 telefon olmoqchiman
🤖 3 ta mahsulot topildi. Qaysi birini olamiz?
   [1. Galaxy A55 8/256GB — Texnomart · 3 490 000 so'm]
   [2. Redmi Note 14 6/128GB — Texnomart · 2 690 000 so'm]

👤 (2-tugma bosildi)
🤖 Texnomart — 1 ta "Redmi Note 14 6/128GB". Buyurtma beramizmi?
   2 715 000 so'm · Mahsulot 2 690 000 · Yetkazish 25 000   [Tasdiqlash]
```

Javob zaxirani hisobga oladi: mahsulot tugagan bo'lsa buyurtma
tayyorlanmaydi, kam qolgan bo'lsa "atigi 2 ta qolgan" deb ogohlantiradi.
Do'konning eng kam summasiga yetmasa, yordamchi YETMAYOTGAN SUMMANI
aytadi ("yana 310 000 so'mlik mahsulot qo'shing") — chunki ovqatdan farqli
o'laroq mahsulotni "yana 7 ta oling" deyish mantiqsiz.

### Ovqatmi yoki mahsulotmi — qaror KATALOG bo'yicha

Bu bosqichdagi eng qiyin joy: "buyur", "olaman", "kerak" so'zlarini
ikkala modul ham ishlatadi. `telefon olaman` va `lag'mon olaman` —
grammatik jihatdan bir xil jumla.

So'zlar ro'yxatiga tayanish ishlamaydi: har yangi mahsulot toifasida
ro'yxatni yangilash kerak bo'ladi va ertami-kechmi unutiladi. Shuning
uchun yordamchi ikkala katalogdan ham qidiradi va qarorni MA'LUMOT
qabul qiladi — qayerda natija topilsa, o'sha modul javob beradi
(`handleShopping()`). Topilgan natija `prefetched` orqali keyingi
bosqichga uzatiladi, shuning uchun qidiruv ikki marta bajarilmaydi.

"Buyurtmam qayerda?" degan savolga yordamchi IKKALA moduldan ham eng
oxirgi buyurtmani oladi va yangirog'i haqida javob beradi — foydalanuvchi
"ovqat" yoki "mahsulot" deb aniqlashtirishi shart emas.

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

### Ovoz bilan boshqarish

Mikrofon tugmasini bosing, gapiring, qo'yib yuboring:

```
🎤 "Navix, telefon qidir"
🤖 3 ta mahsulot topildi. Qaysi birini olamiz?
```

"Navix" so'zi buyruqning bir qismi emas — `stripWakeWord()`
(`src/lib/voice.ts`) uni kesib tashlaydi. Aks holda u qidiruv matniga
oqib ketardi va katalogda hech narsa topilmasdi.

Kesish faqat gap BOSHIDAN bo'ladi: "menga navix haqida ayt" degan
savol buzilmasligi kerak.

#### Nima uchun "har doim quloq soladigan" rejim yo'q

Haqiqiy chaqiruv so'zi (wake word) uchun mikrofon doim ochiq turishi
kerak. Brauzerda bu ishlamaydi:

- batareya bir necha soatda tugaydi;
- har sahifa yangilanganda ruxsat qayta so'raladi;
- fon rejimida brauzer mikrofonni o'chiradi.

Buning uchun mobil ilova kerak. Shuning uchun hozir — tugma.

#### Nima uchun bepul brauzer API'si

`SpeechRecognition` kalitsiz va bepul ishlaydi. Pullik xizmat
(Yandex SpeechKit) aniqroq, lekin karta va oylik to'lov talab
qiladi.

Kamchiligi bor va u yashirilmaydi: **`uz-UZ` ni hamma qurilma
qo'llab-quvvatlamaydi**. Shuning uchun tillar RO'YXAT bo'lib
beriladi (`SPEECH_LANGUAGES`): o'zbekcha ishlamasa, kod jimgina rus
tiliga o'tadi.

Almashtirish oson bo'lsin deb brauzer bilan butun muloqot bitta
faylda (`use-speech-recognition.ts`), qaror qabul qiladigan sof
mantiq esa boshqasida (`voice.ts`) — u to'liq test bilan qoplangan.

#### Ovoz PUL harakatini bajarmaydi

Bu eng muhim qoida:

```
Siz aytdingiz:   "ellik ming yubor"
Telefon eshitdi: "besh yuz ming yubor"
```

Shuning uchun tanilgan matn **kiritish maydoniga** tushadi, yuborilmaydi.
Foydalanuvchi uni ko'radi, kerak bo'lsa tuzatadi va tugmani o'zi bosadi.
Tasdiqlash kartochkasi ham o'z joyida qoladi.

### "Tushunmadim" o'rniga ROST javob

Ilgari "taksi chaqir" deganda yordamchi "Buni hali tushunmadim"
derdi. Bu yolg'on: u tushundi, shunchaki taksi moduli hali yozilmagan.
Foydalanuvchi esa boshqa so'z bilan qayta-qayta urinardi.

Endi javob rost:

```
👤 Navix, taksi chaqir
🤖 Taksi moduli ustida ishlayapmiz — tez orada ochiladi.
   Hozircha men ovqat, Marketplace, to'lovlar va hamyon bilan
   yordam bera olaman.
```

Ro'yxat qo'lda yozilmagan: u `src/config/modules.ts` dagi
`aiIntents` va `status` dan o'qiladi. Ya'ni yangi modul qo'shilsa —
yordamchi uni avtomatik biladi; modul ishga tushib `LIVE` bo'lsa —
"tez orada" javobi o'zi yo'qoladi.

### Tanishtiruv (onboarding)

Ro'yxatdan o'tgan foydalanuvchi avval 4 ta slaydni ko'radi
(`/welcome`), keyin yordamchi uni suhbat ichida kutib oladi va
birinchi qadam tugmalarini beradi.

"O'tkazib yuborish" tugmasi ATAYLAB bor: majburiy tanishtiruv
g'ashga tegadi va odam baribir bosib o'tadi. Chiqish yo'li ochiq
bo'lsa, qolganlar matnni haqiqatan o'qiydi.

Belgi bazada (`user_profiles.onboardedAt`), brauzerda emas —
boshqa telefondan kirganda tanishtiruv qaytadan chiqmasligi kerak.

### Uchta xavfsizlik qoidasi

1. **Yordamchi pulni o'zi harakatlantirmaydi.** U faqat buyruq tayyorlaydi;
   foydalanuvchi tugmani bosgach, mijoz odatdagi endpointga murojaat qiladi.
   Shunda balans, chegara va takroriy so'rov tekshiruvlari o'z joyida
   ishlaydi va ularni chetlab o'tib bo'lmaydi. Ovqat buyurtmasi
   (`POST /api/v1/food/orders`) va Marketplace xaridi
   (`POST /api/v1/market/orders`) ham xuddi shu yo'ldan o'tadi —
   zaxirani kamaytirish va pulni yechish o'sha yerda, bitta
   tranzaksiyada bajariladi.
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

#### Bulutdagi baza uchun: `--prod`

Rollar **har bazada alohida** yashaydi. Lokal bazada admin qilingan
odam Neon'dagi bazada oddiy foydalanuvchi bo'lib qolaveradi.

```bash
npm run role:grant -- 901234567 ADMIN --prod
```

`--prod` bayrog'i `.env.production` faylidan bulut bazasining
manzilini oladi. Skript qaysi bazaga tegayotganini har doim ekranga
yozadi:

```
☁️  BULUTDAGI baza: ep-xxx.eu-central-1.aws.neon.tech/neondb
```

Bu bayroq biriktirish skriptlarida ham ishlaydi:

```bash
npm run restaurant:assign -- osh-markazi 901234567 --prod
npm run shop:assign       -- texnomart   901234567 --prod
npm run courier:assign    -- 901234567 --prod
npm run company:assign    -- texnomart 901234567 --prod
```

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
3. **Environment Variables** bo'limini hozircha bo'sh qoldiring —
   ularni keyingi qadamda terminaldan yuboramiz

4. **Deploy** tugmasini bosing

2-3 daqiqada tayyor bo'ladi va manzil beriladi.

### 6-qadam. O'zgaruvchilarni yuborish

Vercel sahifasidagi katakchalarga qo'lda yozish shart emas — telefonda
bu ishlamaydi ham: Android klaviaturasi qator ajratgichlarini probelga
aylantiradi va 8 ta qator bitta katakka tushib qoladi.

Terminaldan yuborgan qulayroq va xavfsizroq (parollar ekranda umuman
ko'rinmaydi):

```bash
npx vercel login
npx vercel link
npm run deploy:push-env
```

`login` — bir marta. `link` sizdan loyihani so'raydi, ro'yxatdan
`navix` ni tanlaysiz. Uchinchi buyruq esa barcha qiymatlarni
`production` va `preview` muhitlariga yuboradi.

Keyin saytni qaytadan yig'amiz:

```bash
npx vercel --prod
```

Kelajakda sozlama o'zgarsa — faqat shu ikki buyruq:
`npm run deploy:push-env` va `npx vercel --prod`.

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
│   │   ├── market/          # Marketplace (do'kon, mahsulot, zaxira)
│   │   ├── merchant/        # Restoran kabineti (buyurtma holati, menyu)
│   │   ├── seller/          # Sotuvchi kabineti (ombor, mahsulot, buyurtma)
│   │   ├── courier/         # Kuryer moduli (topshiriq, bosqichlar, haq)
│   │   ├── job/             # Ish qidirish (vakansiya, filtr, ariza)
│   │   ├── parcel/          # Posilka jo'natish (tarif, kuzatuv)
│   │   ├── hotel/           # Mehmonxona (xona, bandlik, bandlov)
│   │   ├── employer/        # Ish beruvchi kabineti (e'lon, nomzod, qaror)
│   │   ├── onboarding/      # Tanishtiruv slaydlari
│   │   └── admin/           # Admin panel (xizmatlar, foydalanuvchilar)
│   ├── config/
│   │   ├── modules.ts       # SUPER APP MODULLAR REYESTRI
│   │   ├── rbac.ts          # Rollar va ruxsatlar
│   │   ├── service-providers.ts # To'lov xizmatlari (seed manbasi)
│   │   ├── restaurants.ts   # Restoranlar va menyu (seed manbasi)
│   │   ├── marketplace.ts   # Do'konlar va mahsulotlar (seed manbasi)
│   │   ├── jobs.ts          # Kompaniyalar va vakansiyalar (seed manbasi)
│   │   ├── delivery.ts      # Hududlar va posilka tarifi
│   │   ├── hotels.ts        # Mehmonxonalar va xonalar (seed manbasi)
│   │   ├── protected-routes.ts # Kirish talab qiladigan sahifalar (yagona ro'yxat)
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
│   ├── assign-company.ts    # Kompaniyani egasiga biriktirish (EMPLOYER roli)
│   ├── update.mjs           # Kodni xavfsiz yangilash
│   ├── env-setup.mjs        # Production sozlamalarini yozish
│   ├── deploy-check.mjs     # Production tayyorligini tekshirish
│   ├── deploy-db.mjs        # Bulutdagi bazani tayyorlash
│   ├── deploy-vars.mjs      # Vercel o'zgaruvchilarini chiqarish
│   ├── deploy-push-env.mjs  # O'zgaruvchilarni Vercel'ga yuborish
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

**Sotuvchi kabineti** (`/api/v1/seller/...`)

| Metod | Manzil                 | Tavsif                                  |
| ----- | ---------------------- | --------------------------------------- |
| GET   | `/shops`               | Mening do'konlarim va ko'rsatkichlar    |
| PATCH | `/shops/{id}`          | Ochish/yopish, yetkazish muddati        |
| GET   | `/shops/{id}/products` | Ombor: mahsulotlar va toifalar          |
| POST  | `/shops/{id}/products` | Yangi mahsulot qo'shish                 |
| PATCH | `/products/{id}`       | Narx, zaxira, tavsif, sotuvdagi holati  |
| GET   | `/orders`              | Kelgan buyurtmalar (standart — faollar) |
| GET   | `/orders/{id}`         | Bitta buyurtma                          |
| PATCH | `/orders/{id}`         | Holatni o'zgartirish yoki rad etish     |

**Kuryer kabineti** (`/api/v1/courier/...`)

| Metod | Manzil                    | Tavsif                                     |
| ----- | ------------------------- | ------------------------------------------ |
| GET   | `/overview`               | Kunlik daromad va qo'ldagi topshiriqlar    |
| GET   | `/deliveries`             | Topshiriqlar (`status=AVAILABLE` — umumiy) |
| GET   | `/deliveries/{id}`        | Bitta topshiriq                            |
| POST  | `/deliveries/{id}/accept` | Topshiriqni o'ziga olish                   |
| PATCH | `/deliveries/{id}`        | Olib chiqish, topshirish yoki voz kechish  |

**Ish qidirish** (`/api/v1/jobs/...`)

| Metod | Manzil                        | Tavsif                                       |
| ----- | ----------------------------- | -------------------------------------------- |
| GET   | `/categories`                 | Yo'nalishlar (har birida nechta vakansiya)   |
| GET   | `/cities`                     | Vakansiya bor shaharlar (filtr uchun)        |
| GET   | `/vacancies`                  | Qidiruv, filtrlar va saralash                |
| GET   | `/vacancies/{slug}`           | Bitta vakansiya va o'xshash e'lonlar         |
| GET   | `/applications`               | Mening arizalarim (`status=ACTIVE` — javob kutilayotganlar) |
| POST  | `/applications`               | Ariza yuborish (telefon profildan olinadi)   |
| POST  | `/applications/{id}/withdraw` | Arizani qaytarib olish                       |

**Yetkazib berish** (`/api/v1/parcels/...`)

| Metod | Manzil          | Tavsif                                          |
| ----- | --------------- | ----------------------------------------------- |
| GET   | `/quote`        | Narxni oldindan hisoblash (hech narsa saqlanmaydi) |
| GET   | `/`             | Mening jo'natmalarim                            |
| POST  | `/`             | Yangi jo'natma — pul darhol yechiladi           |
| GET   | `/{id}`         | Bitta jo'natma va holati                        |
| POST  | `/{id}/cancel`  | Bekor qilish va pulni qaytarish                 |

**Mehmonxona** (`/api/v1/hotels/...`)

| Metod | Manzil                    | Tavsif                                              |
| ----- | ------------------------- | --------------------------------------------------- |
| GET   | `/`                       | Mehmonxonalar, qidiruv va saralash                  |
| GET   | `/{slug}`                 | Xonalar; sana berilsa BO'SH JOY ham hisoblanadi     |
| GET   | `/bookings`               | Mening bandlovlarim                                 |
| POST  | `/bookings`               | Xona band qilish — pul darhol yechiladi             |
| GET   | `/bookings/{id}`          | Bitta bandlov                                       |
| POST  | `/bookings/{id}/cancel`   | Bekor qilish va pulni qaytarish                     |

**Ish beruvchi kabineti** (`/api/v1/employer/...`)

| Metod | Manzil               | Tavsif                                              |
| ----- | -------------------- | --------------------------------------------------- |
| GET   | `/companies`         | Mening kompaniyalarim va ko'rsatkichlar             |
| GET   | `/vacancies`         | Mening e'lonlarim (ochiq va yopiq)                  |
| POST  | `/vacancies`         | Yangi e'lon joylash                                 |
| GET   | `/vacancies/{id}`    | Bitta e'lon                                         |
| PATCH | `/vacancies/{id}`    | Tahrirlash, yopish yoki qayta ochish                |
| GET   | `/applications`      | Kelgan arizalar (`status=PENDING` — javob kutayotganlar) |
| PATCH | `/applications/{id}` | Qaror: ko'rildi, suhbatga taklif yoki rad etish     |

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

## Marketplace

Do'konlar, toifalar, mahsulot qidiruvi, savat va buyurtma. Ovqat
modulining tuzilishi qayta ishlatilgan, lekin **uchta jiddiy farqi** bor.

### 1. Zaxira — bu modulning eng nozik joyi

Restoran yana lag'mon pishira oladi. Do'konda esa 3 ta telefon bo'lsa,
to'rtinchisini sotib bo'lmaydi.

Shuning uchun zaxira SHART BILAN kamaytiriladi:

```sql
UPDATE products SET stock = stock - N
WHERE id = ? AND stock >= N
```

Bu qator PostgreSQL'da atomar. Ikki xaridor bir vaqtda oxirgi
mahsulotni olishga urinsa, ikkinchisining `UPDATE` i **0 qator**
o'zgartiradi va biz buni ko'rib xato qaytaramiz.

"Avval o'qib, keyin yozish" yo'li bu yerda ISHLAMAYDI — o'qish bilan
yozish orasida boshqa so'rov ulgurib qoladi. Bu hamyondagi `SELECT ...
FOR UPDATE` bilan bir xil muammo, faqat boshqa yechim bilan.

Tekshirildi: omborda 3 ta bo'lganda 5 ta bir vaqtdagi buyurtmadan
**roppa-rosa 3 tasi** o'tdi, zaxira aniq nolga tushdi va hech qachon
manfiyga ketmadi.

### 2. Bekor qilish oynasi kengroq

Ovqatda chegara "tayyorlanmoqda" dan oldin: oshxona ovqatni tayyorlay
boshlagach mahsulot sarflangan bo'ladi.

Mahsulot esa yig'ilayotgan bo'lsa ham hali omborda turadi — uni javonga
qaytarish mumkin. Shuning uchun bekor qilish **"yo'lga chiqarildi"
gacha** ruxsat etiladi.

Bekor qilinganda ikki narsa qaytadi: **pul** va **zaxira**.

### 3. Toifa do'konga bog'liq emas

Menyu bo'limi ("Salatlar") faqat o'sha restoranga tegishli. Mahsulot
toifasi esa butun maydonchaga umumiy: "telefon" izlagan odam BARCHA
do'konlardagi telefonlarni ko'rishi kerak.

Shuning uchun katalogda avval **toifalar**, keyin do'konlar turadi —
ovqatdagidek "avval joyni tanla" emas.

### Buyurtma bosqichlari

```
Qabul qilinmoqda → Qabul qilindi → Yig'ilmoqda → Yo'lga chiqarildi → Yetkazildi
```

Ovqatdan farq qiladi va bu ataylab: ovqat 45 daqiqada keladi, mahsulot
kunlab yo'lda bo'ladi. Buyurtma sahifasida bosqichlar chizig'i bor —
"hozir qaysi bosqichdamiz" degan savolga bir qarashda javob beradi.

> **16-bosqichda o'zgardi.** Ilgari buyurtma darhol "Qabul qilindi"
> bo'lardi: sotuvchi kabineti yo'q edi va uni hech kim ko'rmasdi.
> Endi buyurtma **"Qabul qilinmoqda"** holatida boshlanadi va uni
> do'kon o'zi tasdiqlaydi. Aks holda xaridor "qabul qilindi" degan
> yozuvni ko'rib turardi, do'kon esa buyurtmadan bexabar qolardi.
>
> **17-bosqichda ovqat ham shu tartibga o'tdi** — ikkala modulda
> bitta qoida. Bundan tashqari yakuniy **"Yetkazildi"** ni endi
> kabinet emas, KURYER qo'yadi.

---

## Sotuvchi kabineti

Manzil: `/seller`. Ilova ichida esa **Profil → Sotuvchi kabineti**
(havola faqat do'kon egalariga ko'rinadi).

Do'konni biriktirish — buyruq orqali, chunki bu biznes qarori
(shartnoma imzolanadi, hujjatlar tekshiriladi):

```bash
npm run shop:assign -- texnomart 901234567
npm run shop:assign -- texnomart 901234567 remove
```

Buyruq do'konni foydalanuvchiga bog'laydi va unga `MERCHANT` rolini
beradi. Yangi rol faqat **qayta kirgandan keyin** ishlaydi.

### Restoran kabinetidan uchta farqi

**1. Ombor — bu kabinetning yuragi.** Restoran menyusida faqat
"bor/yo'q" bor. Do'konda esa aniq SON turadi va u pul bilan bir
qatorda o'zgaradi.

Kun davomida eng ko'p takrorlanadigan amal bitta: "bitta sotildi"
yoki "yangi partiya keldi". Shuning uchun kartochkada **"−" va "+"**
tugmalari bor — bitta bosish, bitta so'rov. Katta o'zgarish uchun
forma ochiladi.

Tugagan mahsulotlar ro'yxatda **tepada** turadi: sotuvchi kabinetga
aynan shular uchun kiradi. Kabinet ularni alohida ham sanaydi —
tugagan tovar ko'rinmaydigan yo'qotish, chunki buyurtma kelmagani
uchun hech qanday signal bo'lmaydi.

**2. Yangi mahsulot qo'shish.** Restoranga menyu bir marta kiritiladi.
Do'kon esa har hafta yangi tovar keltiradi — buni dasturchidan
so'rab bo'lmaydi.

Manzil (`slug`) va qidiruv ustuni (`searchName`) so'rovda **yo'q**:
ikkalasini ham server nomdan hisoblaydi.

- `slug` UNIQUE. Ikki do'kon "Redmi Note 14" sotsa, ikkalasi ham bitta
  manzilga da'vogar bo'ladi — shuning uchun band bo'lsa oxiriga son
  qo'shiladi va urinish takrorlanadi. Yakuniy hakam — bazadagi
  cheklovning o'zi.
- `searchName` esa `toSearchText(name)` dan keladi. Nom o'zgarganda u
  ham birga yoziladi, aks holda mahsulot yangi nomi bo'yicha
  qidiruvda topilmay qolardi. Manzil esa ATAYLAB o'zgarmaydi —
  tashqarida ulashilgan havolalar buzilmasligi kerak.

**3. Rad etish zaxirani ham tiklaydi.** Ovqat rad etilganda
qaytariladigan narsa faqat pul. Mahsulotda esa ikkalasi:

- pul qaytib, zaxira tiklanmasa — tovar javonda turadi, lekin bazada
  "sotilgan" va uni hech kim sotib ololmaydi;
- zaxira tiklanib, pul qaytmasa — xaridor tovarsiz ham, pulsiz ham
  qoladi.

Shuning uchun ikkalasi **bitta tranzaksiyada**: yo hammasi, yo hech
narsa. Idempotentlik kaliti buyurtma ID'sidan hisoblanadi
(`market-refund-{orderId}`) va ustun bazada UNIQUE — takroriy bosish
ikkinchi marta pul qaytarmaydi.

### Do'konni vaqtincha yopish

`isActive` va `isOpen` — ikki xil kalit va bu ataylab:

| Kalit      | Kim boshqaradi | Nima bo'ladi                                    |
| ---------- | -------------- | ----------------------------------------------- |
| `isActive` | Admin          | Do'kon katalogdan butunlay chiqadi              |
| `isOpen`   | Sotuvchi       | Katalogda qoladi, lekin buyurtma qabul qilmaydi |

Yopiq do'kon mahsulotlari o'qiladi — xaridor keyinroq qaytib kelishi
uchun. Buyurtma esa pul yechilishidan OLDIN to'xtatiladi. AI Yordamchi
ham yopiq do'konni umuman taklif qilmaydi: u tayyor buyruq beradi,
bosilgach darhol rad javobini olish yomon tajriba bo'lardi.

### Egalik har bir amalda tekshiriladi

Tekshiruv mijoz yuborgan `shopId` ga emas, **tokendagi
foydalanuvchiga** tayanadi: har so'rovda `shop.ownerId = userId`
sharti qo'yiladi. Mahsulot tahrirlashda esa manzilda do'kon ID'si
umuman yo'q — egalik mahsulotning o'zidan tekshiriladi
(`product.shop.ownerId = userId`).

Begona ID "sizniki emas" emas, **"topilmadi"** qaytaradi: boshqa
do'kon mavjudligini ham oshkor qilmaymiz.

### Raqobatdan himoya

Bitta do'konda bir necha xodim ishlashi mumkin. Holat `updateMany`
orqali, ESKI holat sharti bilan yoziladi: ikki xodim bir vaqtda bossa,
ikkinchisi "holat o'zgardi, sahifani yangilang" xabarini oladi.

Tekshirildi: bir vaqtda 5 ta tasdiqlashdan **roppa-rosa bittasi**
o'tdi; 5 ta rad etishdan ham bittasi o'tdi va pul **bir marta**
qaytdi.

---

## Kuryer moduli

Manzil: `/courier`. Ilova ichida esa **Profil → Kuryer kabineti**
(havola faqat kuryerlarga ko'rinadi).

Kuryerga hech narsa biriktirilmaydi — u umumiy ro'yxatdan ish oladi.
Shuning uchun faqat ROL beriladi:

```bash
npm run courier:assign -- 901234567
npm run courier:assign -- 901234567 remove
```

### Qanday ishlaydi

```
Restoran "Yo'lga chiqarish"  ─┐
                              ├─→  Topshiriq (EGASIZ)  →  Kuryer oladi
Do'kon   "Yo'lga chiqarish"  ─┘         ↓
                                   Olib chiqdi  →  Topshirdi
                                                      ↓
                                  Buyurtma "Yetkazildi" + haq yozildi
```

Ikkala modul bitta ro'yxatga tushadi: kuryer uchun ovqat bilan
mahsulotning farqi deyarli yo'q — ikkalasini ham bir joydan olib,
boshqa joyga eltish kerak.

### Nima uchun ALOHIDA jadval

`courierId` ni to'g'ridan-to'g'ri `food_orders` va `market_orders` ga
qo'shish mumkin edi. Lekin unda kuryerga tegishli hamma narsa —
qachon oldi, qachon olib chiqdi, qancha ishladi — **ikki jadvalda**
takrorlanardi va har yangi modul uchinchi nusxani talab qilardi.

`deliveries` jadvali "yetkazish" tushunchasini bir joyda saqlaydi.
Buyurtma turi kuryer kabinetiga deyarli ahamiyatsiz.

**Aynan bitta buyurtma** qoidasini baza qo'riqlaydi:

```sql
CHECK (("foodOrderId" IS NULL) <> ("marketOrderId" IS NULL))
```

Buni Prisma sxemasida ifodalab bo'lmaydi — ikkala ustun ham
ixtiyoriy ko'rinadi. Dasturda tekshirish esa yetarli emas: ertaga
qo'lda yozilgan SQL uni chetlab o'tishi mumkin.

### Egalik ish jarayonida TUG'ILADI

Do'kon va restoranda egalik oldindan ma'lum va o'zgarmaydi. Kuryerda
esa topshiriq **egasiz** paydo bo'ladi va uni birinchi ulgurgan
kuryer oladi. Shuning uchun olish — raqobatli amal:

```sql
UPDATE deliveries SET "courierId" = ?, status = 'ACCEPTED'
WHERE id = ? AND "courierId" IS NULL AND status = 'OFFERED'
```

Nol qator o'zgarsa — kimdir ulgurgan. Tekshirildi: bir vaqtda 3 ta
urinishdan **roppa-rosa bittasi** o'tdi.

### Mijozning raqami — faqat egasiga

Umumiy ro'yxatni har bir kuryer ko'radi. Agar javobda telefon bo'lsa,
buyurtma bermagan o'nlab odam mijozning raqamini olardi. Ekranda
yashirish yetarli emas — javobni to'g'ridan-to'g'ri o'qish mumkin.

Shuning uchun raqam **serverda** kesiladi va faqat topshiriqni olgan
kuryerga ochiladi. Manzil esa qoladi: kuryer "bu yo'nalish menga
to'g'ri keladimi" degan qarorni usiz qabul qila olmaydi.

### Voz kechish — bu jadvaldagi yagona "orqaga qadam"

Buyurtma orqaga qaytmaydi. Topshiriq esa qaytadi: kuryerning
mototsikli buzilishi mumkin va mijoz kutib qolgandan ko'ra boshqa
kuryer olgani yaxshiroq.

Lekin faqat buyurtma **hali olinmagan** bo'lsa. Mahsulot kuryerning
qo'lida bo'lsa, uni javonga qaytarib bo'lmaydi.

### Haq — `EARNING`, `REFUND` emas

Yetkazilgach kuryerga haq yoziladi. U alohida tur:

| Tur       | Ma'nosi                                              |
| --------- | ---------------------------------------------------- |
| `REFUND`  | "sizning pulingiz qaytarildi" — avval chiqim bo'lgan |
| `EARNING` | "siz ishlab topdingiz" — hech qanday chiqim yo'q     |

Kuryerning daromadi tarixda qaytarilgan pul bo'lib ko'rinsa, "bugun
qancha ishladim?" degan savolga javob topib bo'lmasdi.

Topshiriqning yakunlanishi, buyurtmaning yopilishi va haqning
yozilishi — **bitta tranzaksiyada**. Topshiriq yopilib buyurtma
"yo'lda" qolsa, mijoz hech qachon "yetkazildi" ni ko'rmaydi;
buyurtma yopilib haq yozilmasa, kuryer bepul ishlagan bo'ladi.

### Nima uchun xaritasiz

Jonli kuzatuv xarita API kalitini talab qiladi va u pullik. Lekin
yetkazishning asosiy qismi kalitsiz ham ishlaydi: kim oldi, nima
olib ketilyapti, qayerga, mijozning telefoni va har bosqichdagi
xabar.

Xarita keyinchalik shu poydevor ustiga qo'shiladi — bosqichlar va
jadval o'zgarmaydi.

---

## Ish qidirish

Manzil: `/jobs`. Oqim: **vakansiyalar → qidiruv va filtr → e'lon →
ariza → arizalarim**.

Bu modulda **pul yo'q** — va bu tasodif emas. Ovqat, Marketplace va
kuryerda har amal hamyonga tegardi, shuning uchun u yerlarda
idempotentlik kaliti, tranzaksiya va pulni qaytarish mexanizmi kerak
edi. Bu yerda ular ataylab qo'shilmadi: keraksiz murakkablik kodni
tushunishni qiyinlashtiradi.

### Maosh — eng muhim raqam

Ish qidiruvchi e'lonni ochishdan oldin bitta savolga javob qidiradi:
qancha to'lanadi. Shuning uchun maosh kartochkada eng katta yozilgan.

To'rtta holat bor va har biri boshqacha o'qiladi:

| Bazadagi qiymat            | Ekranda                       |
| -------------------------- | ----------------------------- |
| `salaryMin` va `salaryMax` | `3 000 000 – 5 000 000 so'm`  |
| faqat `salaryMin`          | `3 000 000 so'mdan`           |
| faqat `salaryMax`          | `5 000 000 so'mgacha`         |
| ikkalasi ham `null`        | `Kelishilgan`                 |

Oxirgi qator eng muhimi. Agar `null` o'rniga nol chizilsa, ekranda
"0 so'm" paydo bo'lardi — ya'ni "bepul ishlang". Shuning uchun buni
bitta funksiya bajaradi (`formatSalary`) va u test bilan qo'riqlanadi.

Maosh boshqa hamma joydagi kabi **tiyinda** saqlanadi. Filtrda esa
so'mda so'raladi: manzil satrida `minSalarySom=3000000` yozuvi
odamga tushunarli, `300000000` esa yo'q.

Maosh bo'yicha saralashda "Kelishilgan" e'lonlar **oxirida** turadi —
aks holda ular eng qimmat e'lonlar bilan aralashib, ro'yxat
ma'nosini yo'qotardi.

### Bitta e'longa bitta ariza

Nomzod bir e'longa o'nlab ariza yuborishi mumkin edi: tugmani ikki
marta bosish yoki ikkita ochiq varaq yetarli. Buni dasturda
tekshirish esa yetmaydi — ikki so'rov bir vaqtda kelsa, ikkalasi ham
"hali yo'q" deb ko'radi.

Shuning uchun qoidani **baza** qo'riqlaydi:

```prisma
@@unique([vacancyId, userId])
```

Ikkinchi yozuv UNIQUE xatosiga uchraydi va biz uni tushunarli
xabarga aylantiramiz: *"Siz bu vakansiyaga allaqachon ariza
yuborgansiz"*. Bu — hamyondagi idempotentlik kaliti bilan bir xil
naqsh.

Arizani qaytarib olganda yozuv **o'chirilmaydi**, holati
`WITHDRAWN` ga o'zgaradi. Shunda cheklov kuchda qoladi va nomzod
yubor-qaytar qilib ish beruvchini bezovta qila olmaydi.

### Telefon raqami so'rovdan KELMAYDI

Ariza yuborishda mijozdan faqat qisqa xat qabul qilinadi. Kim
yuborayotgani tokendan, telefon raqami esa profildan olinadi.

Aks holda begona odam nomidan ariza yuborish yoki boshqa odamning
raqamini yozib, uni keraksiz qo'ng'iroqqa ko'mib tashlash mumkin
bo'lardi. Buni test alohida qo'riqlaydi: `contactPhone` va `userId`
so'rov tanasidan **tashlab yuboriladi**.

Raqam ariza yozuviga nusxa qilinadi: nomzod keyinchalik uni
o'zgartirsa ham, ish beruvchi ariza kelgan paytdagi raqamga
qo'ng'iroq qiladi.

Ariza oynasida bu ochiq yoziladi — foydalanuvchi nima
ulashayotganini bilib turishi kerak.

### Ariza holatlari

| Holat       | Ma'nosi              | Kimning amali |
| ----------- | -------------------- | ------------- |
| `SENT`      | Yuborildi            | nomzod        |
| `VIEWED`    | Ko'rib chiqilmoqda   | ish beruvchi  |
| `INVITED`   | Suhbatga taklif      | ish beruvchi  |
| `REJECTED`  | Rad etildi           | ish beruvchi  |
| `WITHDRAWN` | Qaytarib olindi      | nomzod        |

Oxirgi uchtasi — **yakuniy**. Ulardan hech qayerga chiqib
bo'lmaydi: aks holda ish beruvchi "suhbatga taklif" ni jimgina "rad
etildi" ga o'zgartirib qo'yishi mumkin bo'lardi va nomzod nima
bo'lganini tushunmasdi.

Nomzod arizani faqat javob kelmagunicha qaytarib ola oladi.

### Vakansiyalar qayerdan keladi

`src/config/jobs.ts` — 8 ta yo'nalish, 5 ta kompaniya va 11 ta
vakansiya. Restoran va do'konlar kabi, bu ham seed manbasi:
`npm run db:seed` uni bazaga yozadi.

Qidiruv apostrofga bog'liq emas: `o'qituvchi` ham, `oqituvchi` ham
bir xil natija beradi (sababi quyidagi "Apostrof muammosi"
bo'limida).

---

## Ish beruvchi kabineti

Manzil: `/employer`. Kompaniya egasi shu yerda e'lon joylaydi va
nomzodlarni ko'rib chiqadi.

Kabinet OCHILADI, lekin o'zi ochilmaydi: kompaniya biriktirilishi
kerak.

```
npm run company:assign -- texnomart 901234567
```

Bu buyruq kompaniyani odamga biriktiradi va `EMPLOYER` rolini
beradi. Ilovadan chiqib qaytadan kirish shart — rol kirish tokeniga
yoziladi.

### Nima uchun buyruq orqali, ilova ichidan emas

Bu kabinet nomzodlarning TELEFON RAQAMLARINI ochadi. "O'zim ish
beruvchiman" deb tugma bosib bunday huquqni olish mumkin
bo'lmasligi kerak — kompaniya haqiqiyligi tekshiriladi va shartnoma
imzolanadi.

Restoran va do'kon biriktirish bilan bir xil mantiq.

### Nima uchun ALOHIDA rol

`MERCHANT` roli allaqachon bor edi va unga qo'shib qo'yish oson
edi. Lekin mahsulot sotadigan do'kon bilan odam yollaydigan
kompaniya — ikki xil biznes.

Bitta ruxsat ikkinchisini ochib yuborsa, har bir do'kon egasi
begona kompaniyaning nomzodlari ro'yxatini ko'radigan bo'lardi.
Shuning uchun `EMPLOYER` alohida rol va unda savdo ruxsatlari
umuman yo'q.

### Uchta chegara

**1. Egalik har bir amalda tekshiriladi.** Tekshiruv mijoz yuborgan
ID'ga emas, tokendagi foydalanuvchiga tayanadi: har so'rovda
`company.ownerId = userId` sharti qo'yiladi. Begona ID "topilmadi"
qaytaradi — boshqa kompaniya mavjudligini ham oshkor qilmaymiz.

**2. Telefon raqami faqat e'lon egasiga.** Nomzodning raqami
`vacancy.company.ownerId` tekshiruvidan o'tgandan keyingina
qaytariladi. Har bir qaror auditga yoziladi: aynan o'sha daqiqada
ish beruvchi raqamni ko'rgan bo'ladi, va shikoyat kelsa "kim,
qachon, kimning ma'lumotini ochdi" degan savolga javob shu yerdan
topiladi.

**3. Qarorni qaytarib bo'lmaydi.** "Suhbatga taklif" va "rad etish"
— yakuniy javob. Nomzod allaqachon xabar olgan, shuning uchun uni
jimgina o'zgartirish mumkin emas. Buni `APPLICATION_TRANSITIONS`
jadvali hal qiladi — nomzod tomonidagi bilan AYNI jadval.

Ish beruvchi `WITHDRAWN` holatini qo'ya olmaydi: arizani faqat
nomzodning o'zi qaytarib oladi. Aks holda noqulay nomzodni "o'zi
qaytarib olgan" qilib ko'rsatib qo'yish mumkin bo'lardi.

### E'lon O'CHIRILMAYDI, yopiladi

O'chirish tugmasi ataylab yo'q. U bilan birga arizalar ham
yo'qolardi — nomzodlar esa javob kutib turishibdi.

Yopilgan e'lon katalogdan chiqadi, arizalar joyida qoladi va
ularga javob berish mumkin.

### Nomzodga qachon xabar boradi

| Qaror              | Xabar |
| ------------------ | ----- |
| Ko'rib chiqilmoqda | yo'q  |
| Suhbatga taklif    | ha    |
| Rad etildi         | ha    |

"Ko'rib chiqilmoqda" — bu hali javob emas. Har ochilganda xabar
yuborilsa, nomzodning bildirishnomalari foydasiz matnga to'lib
ketardi va haqiqiy javob ular orasida ko'rinmay qolardi.

Rad javobi esa YUBORILADI. Jimlik eng yomon javob: nomzod haftalab
kutadi va boshqa ish qidirmaydi.

Suhbatga taklifda ish beruvchining izohi xabar matniga qo'shiladi —
odatda aynan u yerda "ertaga soat 10 da keling" deb yoziladi va uni
yashirish xabarni foydasiz qilardi.

---

## Yetkazib berish (posilka)

Manzil: `/delivery`. Oqim: **yo'nalish → posilka → qabul qiluvchi →
to'lov → kuzatuv**.

### Ovqat va Marketplace'dan ENG KATTA farqi

U yerlarda **sotuvchi** bor: restoran ovqat tayyorlaydi, do'kon
tovarni yig'adi va ular buyurtmani qabul qilishi kerak.

Bu yerda sotuvchi **yo'q**. Foydalanuvchi to'laydi va jo'natma
darhol kuryerlarning umumiy ro'yxatiga tushadi — "qabul qilish"
bosqichi umuman kerak emas.

### Narx qanday hisoblanadi

Aniq masofani bilish uchun xarita API kaliti kerak va u pullik.
Shuning uchun narx masofaga emas, ikkita oddiy savolga tayanadi:

| Savol | Ta'siri |
| ----- | ------- |
| Bir hudud ichidami yoki hududlararomi? | 15 000 yoki 35 000 so'm |
| Og'irligi qancha? | 1 kg gacha bepul, keyin har kg uchun +5 000 so'm |

**Nima uchun zona jadvali emas.** "Har hududga zona raqami berib,
farqiga qarab hisoblash" degan vasvasa bor edi. Lekin u **yolg'on
aniqlik** beradi: Andijon va Farg'ona yonma-yon, Andijon va Xorazm
esa mamlakatning ikki chekkasida — zona raqami buni ajrata olmaydi.

Yagona tarif esa halol: u hech narsani "aniq bilaman" demaydi va
O'zbekistondagi haqiqiy pochta xizmatlari ham shunday ishlaydi.
Xarita qo'shilganda narx funksiyasi almashtiriladi, jadval va
bosqichlar o'zgarmaydi.

Tarif `src/config/delivery.ts` da — so'mda yozilgan, chunki uni
dasturchi emas, ilova egasi o'qiydi.

**Narx mijozdan kelmaydi.** So'rovda summa yo'q va bo'lmasligi ham
kerak: aks holda so'rovni tahrirlab Xorazmga 100 so'mga posilka
jo'natish mumkin bo'lardi.

### Og'irlik nima uchun GRAMMDA

Kilogrammda so'ralsa kasr son kelardi (1.5 kg) va u bazada
yaxlitlanib, narx bilan mos kelmay qolardi. Grammda esa hamma
narsa butun son — bu pulni `BigInt` tiyinda saqlash bilan bir xil
sabab.

Qo'shimcha og'irlik **boshlangan** kilogramm bo'yicha sanaladi:
1200 gramm — bu bitta qo'shimcha kilogramm. Aks holda 1999 gramm
bepul ketardi va tarozidagi har gramm bahsga aylanardi.

### Holat qayerda saqlanadi

Posilkaning **o'z holati yo'q**. U `Delivery` jadvalidan o'qiladi.

Ikkita holat ustuni bo'lganda ular ertaga bir-biridan ajralib
qolardi: kuryer "yo'lda" derdi, posilka sahifasi esa "kuryer
kutilmoqda". Bir haqiqatni ikki joyda saqlamaymiz.

Shu sababli `deliveries` jadvalidagi CHECK cheklovi ham
yangilandi — endi **uchta** manbadan aynan bittasi to'ldiriladi:

```sql
CHECK (
  (CASE WHEN "foodOrderId"   IS NULL THEN 0 ELSE 1 END) +
  (CASE WHEN "marketOrderId" IS NULL THEN 0 ELSE 1 END) +
  (CASE WHEN "parcelId"      IS NULL THEN 0 ELSE 1 END) = 1
)
```

### Bekor qilish

Kuryer **olib chiqmaguncha** bekor qilish mumkin va pul to'liq
qaytariladi. Posilka kuryerning qo'liga o'tgandan keyin esa
"bekor qilish" ma'nosini yo'qotadi: buyum yo'lda va uni qaytarish
alohida ish, alohida xarajat.

Bekor qilishda holat **shartli** yangilanadi: shu oniyda kuryer
topshiriqni olib qo'ygan bo'lishi mumkin.

### Kuryer nimani ko'radi

Kuryer kabinetida posilka uchinchi tur sifatida qo'shildi
(`PARCEL`). Undagi farq — **olib ketish manzili**: restoran va
do'konning manzili kuryerga tanish (ular ro'yxatda va bir joyda
turadi), posilka esa har safar yangi manzildan olinadi.

Qabul qiluvchining telefoni umumiy ro'yxatda **ko'rinmaydi** —
faqat topshiriqni olgan kuryerga ochiladi. Bu ovqat va
Marketplace'dagi bilan bir xil qoida.

---

## Mehmonxona

Manzil: `/hotel`. Oqim: **sana → mehmonxona → xona → bandlov**.

### Modulning ENG NOZIK joyi: bo'sh joy

Bitta xonani ikki kishiga sotib bo'lmaydi. Buni tekshirish esa
oddiy "bormi?" savoli emas — bandlovlar **sana oralig'i** bo'yicha
kesishadi:

```
yangi.kirish < mavjud.chiqish  VA  yangi.chiqish > mavjud.kirish
```

Chegaralar **ataylab qat'iy** (`<`, `>`): bir mehmon 9-avgustda
chiqsa, ikkinchisi o'sha kuni kirishi mumkin — xona bo'shaydi.

**Raqobatdan himoya.** Ikki so'rov bir vaqtda kelsa, ikkalasi ham
"bitta xona bor" deb ko'rishi mumkin. Shuning uchun xona qatori
`SELECT ... FOR UPDATE` bilan qulflanadi — hamyondagi bilan bir xil
naqsh. Tekshiruvda 2 xonaga 5 ta bir vaqtdagi so'rov yuborildi va
aynan 2 tasi o'tdi.

### Xona — bu NOMER emas, TUR

Har bir xonani alohida yozuv qilish mumkin edi ("204-xona"), lekin
mehmon xona raqamini tanlamaydi — u "Standart" yoki "Lyuks" ni
tanlaydi.

Shuning uchun bazada tur va uning **soni** saqlanadi
(`totalRooms`), bo'sh joy esa shu son bilan solishtirib
aniqlanadi.

### Sanalar nima uchun VAQTSIZ

Mehmon "5-avgustda kelaman" deydi, "5-avgust 00:00:00 UTC" demaydi.

Vaqt bilan saqlansa, Toshkent (UTC+5) da yarim tundan keyingi
bandlov "kechagi kun" bo'lib qolishi mumkin edi. Shuning uchun
ustunlar `@db.Date` va hisob-kitob UTC'da bajariladi.

Kechalar soni ham shu sababdan alohida funksiyada
(`countNights`) va u test bilan qoplangan: 7-dan 9-gacha — **2
kecha**, garchi sanalar uchtaga tegsa ham.

### Bo'sh joy `null` va `0` — boshqa-boshqa narsa

| Qiymat | Ma'nosi              | Ekranda            |
| ------ | -------------------- | ------------------ |
| `null` | sana hali tanlanmagan | "Sana tanlang"     |
| `0`    | joy tugagan          | "Bo'sh xona yo'q"  |
| `3`    | uchta bo'sh          | "3 ta bo'sh"       |

Ikkalasini bir xil ko'rsatish foydalanuvchini chalg'itardi.

### Nima uchun mehmonxona kabineti yo'q

Ovqat va Marketplace'da sotuvchi buyurtmani **qabul qilishi** kerak
edi. Bu yerda esa xona bo'shligi bandlov paytida tekshiriladi va
darhol biriktiriladi — kutadigan hech kim yo'q. Shuning uchun
"kutilmoqda" holati ham yo'q.

### Bekor qilish

**Kirish kunigacha** bekor qilish mumkin va pul to'liq qaytariladi.
Kirish kuni boshlangandan keyin esa "bekor qilish" ma'nosini
yo'qotadi: xona band bo'lgan va boshqa mehmon uni sotib ololmagan.

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

**19-bosqichda topilgan xato.** Bu himoya to'g'ri, lekin u brauzer
tomonida bitta shartni talab qiladi: yangilash so'rovi bir vaqtda
**faqat bitta** bo'lishi kerak. Aks holda:

```
1-so'rov  →  yangi token oldi        (eskisi yaroqsiz bo'ldi)
2-so'rov  →  ESKI token bilan keldi  →  "o'g'irlik!" → sessiya yopildi
```

Natijada foydalanuvchi hech narsa qilmasdan tizimdan chiqib qolardi.
Xato brauzer sinovida ushlandi: `/jobs` sahifasi uchta so'rovni bir
vaqtda yuboradi (yo'nalishlar, shaharlar, vakansiyalar) va token
eskirgan paytda uchalasi ham yangilashni boshlab yubordi.

Yechim ikki qatlamli.

**1-qatlam — brauzerda.** `AuthProvider` bir vaqtda faqat bitta
yangilash so'rovini yuboradi; qolgan chaqiruvlar o'sha so'rovning
natijasini kutadi.

**2-qatlam — serverda.** Birinchi qatlam bitta varaq ichida
yetarli, lekin refresh token **cookie'da** saqlanadi va u barcha
varaqlar uchun bitta. Ikkita varaq bir zumda yangilashni boshlasa,
ular alohida brauzer holatiga ega — birinchi qatlam ularni
birlashtira olmaydi.

Shuning uchun serverda **qisqa muhlat** bor: bir oldingi token
almashtirilgandan keyin **30 soniya** davomida qabul qilinadi.

| Taqdim etilgan token          | Qaror     | Nima bo'ladi                          |
| ----------------------------- | --------- | ------------------------------------- |
| joriy token                   | `current` | oddiy almashtirish, cookie yangilanadi |
| bir oldingi, 30 soniya ichida | `grace`   | access token beriladi, **cookie'ga tegilmaydi** |
| notanish yoki eskiroq         | `unknown` | sessiya darhol yopiladi               |

`grace` holatida cookie ataylab o'zgartirilmaydi: ikkita javob
bir-birining cookie'sini bosib ketsa, oxirida qaysi token qolgani
noaniq bo'lardi.

Butun amal `SELECT ... FOR UPDATE` bilan **qulflanadi** — xuddi
hamyondagi kabi. Qulfsiz ikkala so'rov bir xil holatni o'qib olib,
ikkalasi ham "men birinchiman" deb token almashtirardi.

**Himoya yo'qolmadi.** O'g'irlangan token faqat almashtirilgandan
keyingi 30 soniya ichida ishlaydi; undan keyin sessiya baribir
yopiladi. Qaror `classifyRefreshToken()` funksiyasida va u to'liq
test bilan qoplangan.

> **Yo'l-yo'lakay topilgan ikkinchi xato.** Dastlab sessiyani yopish
> tranzaksiya ICHIDA yozilgandi. PostgreSQL xato tashlanganda
> tranzaksiyadagi hamma narsani orqaga qaytaradi — ya'ni yopish ham
> bekor bo'lardi va o'g'irlikdan himoya jimgina ishlamay qolardi.
> Buni haqiqiy baza ustidagi tekshiruv ushladi; endi yopish
> tranzaksiyadan tashqarida bajariladi.

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
- [x] **14-bosqich** — Marketplace: do'konlar, toifalar, mahsulotlar, savat, zaxira nazorati
- [x] **15-bosqich** — AI Yordamchiga Marketplace'ni ulash: suhbat ichida xarid, zaxira nazorati
- [x] **16-bosqich** — Sotuvchi kabineti: mahsulot qo'shish, ombor, buyurtma holati, rad etish
- [x] **17-bosqich** — Kuryer moduli: yetkazish topshirig'i, umumiy ro'yxat, avtomatik haq
- [x] **18-bosqich** — AI Yordamchi: tanishtiruv, ovoz bilan boshqarish, rost javoblar
- [x] **19-bosqich** — Ish qidirish: vakansiyalar, qidiruv va filtrlar, ariza, arizalar tarixi
- [x] **20-bosqich** — Ish beruvchi kabineti: vakansiya joylash, nomzodlar, suhbatga taklif
- [x] **21-bosqich** — Yetkazib berish: posilka jo'natish, tarif, kuzatuv, bekor qilish
- [x] **22-bosqich** — Mehmonxona: xonalar, sana bo'yicha bandlik, bandlov va bekor qilish
- [ ] **21-bosqich** — SMS xizmati (Eskiz.uz) — busiz begona odam ro'yxatdan o'ta olmaydi
- [ ] **22-bosqich** — Taksi moduli (xarita API kaliti kerak)
- [ ] **23-bosqich** — Real to'lov integratsiyasi (Payme / Click)

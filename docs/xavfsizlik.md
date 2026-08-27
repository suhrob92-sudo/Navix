# Xavfsizlik holati

Bu hujjat Navix qanday hujumlardan himoyalanganini, qaysilaridan
himoyalanmaganini va sizdan nima talab qilinishini yozadi.

## Avval bitta ochiq gap

**"100% xavfsiz" degan tizim yo'q.** Banklar ham, Google ham 100%
xavfsiz emas. Kimdir ilovangizni "to'liq xavfsiz" desa — u yo
bilmaydi, yo aldayapti.

Haqiqiy xavfsizlik boshqacha ishlaydi:

1. ma'lum bo'lgan hujum turlarini tizimli yopish;
2. har birini **avtomatik sinov** bilan qulflash, toki keyingi
   o'zgarish uni ochib qo'ymasin;
3. hujum bo'lganda uni **ko'ra olish** va tez to'xtata olish.

Quyida uchalasi bo'yicha holat.

---

## 1. Yopilgan hujumlar

Har biri **hujum simulyatsiyasi** bilan tekshirilgan: sinov haqiqiy
hujumni takrorlaydi va u ishlamasligi kerak.

| Hujum | Nima bo'lardi | Himoya |
|---|---|---|
| **Ochiq yo'naltirish** | Haqiqiy navix.uz havolasi bilan odam kirgach, soxta saytga tashlanardi va parolini ikkinchi marta o'sha yerga yozardi | `?next=` faqat ichki yo'l bo'lishi tekshiriladi |
| **Begona ma'lumot (IDOR)** | Boshqa odamning suhbatini, guruhini, buyurtmasini ID bilan ochish | Har bir so'rovda a'zolik/egalik tekshiriladi, javob `404` |
| **Token qalbakilashtirish** | O'zini boshqa odam yoki admin qilib ko'rsatish | Imzo, algoritm (`HS256`), `iss`, `aud` va token turi tekshiriladi |
| **`alg=none` hiylasi** | Imzosiz token bilan kirish | Algoritm ro'yxati qat'iy belgilangan |
| **Parol taxmin qilish** | Bitta hisobga minglab parol sinash | Telefon bo'yicha cheklov + muvaffaqiyatda nolga qaytarish |
| **Credential stuffing** | 10 000 raqamga bittadan ommabop parol sinash | Manzil (IP) bo'yicha alohida cheklov — soatiga 30 |
| **Foydalanuvchilarni sanash** | Qaysi raqamlar tizimda borligini aniqlash | Xato matni bir xil; mavjud bo'lmagan hisob uchun ham parol tekshiruvi vaqti sarflanadi |
| **SQL kiritish** | Bazani o'qish yoki o'chirish | Barcha so'rovlar parametrlangan; `Unsafe` variantlar ishlatilmaydi |
| **XSS** | Izoh ichidagi kod boshqa odamning brauzerida ishga tushishi | `dangerouslySetInnerHTML` umuman ishlatilmaydi; CSP qo'shimcha qatlam |
| **Clickjacking** | Saytni begona sahifa ichiga solib, tugma bostirish | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` |
| **Formani o'g'irlash** | Kirish formasini begona serverga yuborish | CSP `form-action 'self'` |
| **CSRF** | Boshqa saytdan sizning nomingizdan amal bajarish | Amallar `Bearer` token bilan (cookie'da emas); refresh cookie `sameSite=lax` |
| **Token o'g'irlash (XSS orqali)** | Refresh tokenni JavaScript bilan o'qish | Cookie `httpOnly` — JavaScript uni ko'rmaydi |
| **Yo'l bilan chiqib ketish** | `../../etc/passwd` kabi manzil bilan server fayllarini o'qish | Fayl kaliti qat'iy shablon bilan tekshiriladi |
| **Soxta fayl turi** | `.exe` ni "rasm" deb yuklash | Tur faylning O'Z baytlaridan aniqlanadi, brauzer aytganiga ishonilmaydi |
| **Xotirani to'ldirish** | 100 MB li JSON yuborib serverni yiqitish | Tana hajmi 256 KB bilan cheklangan, `413` qaytadi |
| **Redis'ni to'ldirish** | Qo'ng'iroq signaliga megabaytlab axlat tiqish | Signal maydonlari hajmi cheklangan |
| **Katalogni ko'chirib olish** | Barcha mehmonxona/reys/vakansiyani skript bilan yig'ish | Ochiq kataloglarda manzil bo'yicha cheklov |
| **Sessiyani ushlab qolish** | Chiqqandan keyin ham eski token bilan ishlash | Bekor qilingan sessiyalar Redis qora ro'yxatida — DARHOL kuchga kiradi |
| **Ichki manzil sizishi** | Baza yiqilganda xato matnida Neon manzili ko'rinishi | Production'da xato matni yashiriladi, sabab faqat log'da |

### Xavfsizlik tekshiruvida topilgan va tuzatilgan haqiqiy xatolar

Bular taxmin emas — kod o'qib topilgan va tuzatilgan:

1. **Ochiq yo'naltirish** — `?next=` tekshirilmasdi.
2. **Rol olib qo'yilgach, admin 15 daqiqa admin bo'lib qolardi** —
   sessiya bazada bekor qilinardi, lekin Redis qora ro'yxatiga
   yozilmasdi. Har so'rovda esa aynan qora ro'yxat tekshiriladi.
3. **Refresh token o'g'irlangani aniqlanganda ham 15 daqiqa
   kechikish** — bu hisob o'g'irlanganining eng kuchli belgisi va
   aynan o'sha daqiqada kirish darhol to'xtashi kerak edi.
4. **So'rov tanasi hajmi cheklanmagan edi.**
5. **Kirishda manzil bo'yicha cheklov yo'q edi.**
6. **Ochiq kataloglarda cheklov yo'q edi.**
7. **`/api/openapi` butun API xaritasini ochiq berardi** — endi
   production'da admin ruxsati talab qilinadi.
8. **Mijoz idempotentlik kaliti hammaga umumiy edi** — bir xil kalit
   yuborgan ikkinchi odam BIRINCHISINING hamyon yozuvini va balansini
   ko'rardi, o'zining puli esa qo'shilmasdi. Kalit endi egasiga
   bog'lanadi (`client:{foydalanuvchiId}:{kalit}`).

---

### Begona ma'lumotni ko'rish — 95 ta jonli tekshiruv

Eng ko'p uchraydigan sizib chiqish "hujum" bilan emas, bitta
unutilgan shart bilan bo'ladi: yozuv ID bo'yicha o'qiladi, lekin
"bu senikimi?" degan tekshiruv yozilmaydi.

Shuning uchun ikkita (ba'zi joyda oltita) haqiqiy hisob bilan
tekshirildi. Har bir tekshiruvda IKKI so'rov bor: egasi so'raydi —
ochilishi kerak; begona so'raydi — ochilmasligi kerak. Ikkinchisisiz
sinov aldardi, chunki ishlamaydigan manzil ham "ochilmadi" beradi.

Tekshirilgani:

| Nima | Natija |
|---|---|
| Buyurtma, bandlov, posilka, chipta, to'lov, manzil | begonaga 404 |
| Suhbat va undagi xabarlar | begonaga 404 |
| Bekor qilish, tahrirlash, o'chirish (begona yozuvda) | 404, bazada o'zgarish yo'q |
| Sotuvchi/restoran/kuryer/ish beruvchi kabinetlari | begona biznes yozuvi 404 |
| Guruh chat, taklif havolasi, qo'ng'iroqqa qo'shilish | a'zo bo'lmaganga 404 |
| Xabar qidiruvi | begona suhbatdagi xabar topilmaydi |
| Hikoyani kim ko'rgani | faqat muallifga |
| Ochiq javoblarda telefon raqami | yo'q |

95 ta tekshiruvning hammasi o'tdi — teshik topilmadi. Holat
`src/config/data-ownership.test.ts` bilan qotirib qo'yilgan: shaxsiy
jadvaldan ID bo'yicha o'qish yozilsa, sinov yiqiladi va sababini
yozishni talab qiladi.

---

## 2. Ataylab OCHIQ qoldirilgan narsalar

Xavfsizlik — bu savdo. Quyidagilar ataylab yopilmagan va sababi bor.

### 2.1. To'liq CSP majburiy emas

Hozir CSP ikki qismda: xavfsiz qism majburiy, qattiq qism kuzatuvda.

**Nima uchun:** to'liq CSP uchun `nonce` kerak, `nonce` esa Next.js'da
barcha oldindan tayyorlangan sahifalarni dinamikaga o'tkazadi. 100 dan
ortiq sahifa har tashrifda qaytadan yasaladi — sayt sekinlashadi,
Vercel hisobi oshadi.

XSS himoyasining ASOSIY qatlami baribir joyida: HTML umuman
yasalmaydi, React barcha matnni avtomatik xavfsizlaydi.

### 2.2. Pul o'tkazmasida raqam borligi bilinadi

O'tkazma qilayotganda "bunday raqam yo'q" degan javob raqam
ro'yxatdan o'tganini aytadi.

**Nima uchun:** busiz pulni noto'g'ri raqamga yuborib qo'yish mumkin
bo'lardi. Barcha bank ilovalari xuddi shunday ishlaydi. Sanab
chiqishni cheklov to'sadi: soatiga 20 ta pul amali.

### 2.3. `npm audit` uchta ogohlantirish beradi

`prisma` → `@prisma/config` → `deepmerge-ts`. `prisma` — bu buyruq
qatori vositasi (`devDependencies`), ishlab chiqarish serverida yo'q.
Zaiflik esa Prisma **sozlama faylini** o'qiyotganda yuz beradi — o'sha
faylni biz yozamiz. Yangi versiya chiqqanda yopiladi.

---

## 3. Sizdan talab qilinadigan ishlar

Kod tomonidan hamma narsa qilingan. Quyidagilar **faqat sizga**
bog'liq va ularsiz yuqoridagi himoyalarning bir qismi ma'nosini
yo'qotadi.

### 3.1. Kalitlarni almashtirish — ENG MUHIMI

Ishlab chiqish davomida chatda, ekran suratida yoki logda ko'ringan
har qanday kalit **almashtirilishi shart**:

- Neon (baza) paroli;
- Upstash (Redis) tokeni;
- `JWT_ACCESS_SECRET` va `JWT_REFRESH_SECRET`.

**Nima uchun birinchi o'rinda:** JWT kaliti bilan istalgan odam
o'zini istalgan foydalanuvchi qilib ko'rsata oladi — jumladan
`SUPER_ADMIN`. Yuqoridagi barcha himoyalar bu holatda ishlamaydi.

Yangi kalit yasash:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

### 3.2. Kalitni HECH KIMGA yubormang

Jumladan yordam so'ralayotgan odamga, jumladan menga. Faqat **xato
matnini** yuboring.

### 3.3. Xatolar sahifasini kuzatib turing

```
https://<domeningiz>/admin/errors
```

Hujum ko'pincha shu yerda ko'rinadi: bir xil manzilga yuzlab xato,
g'alati maydon nomlari, tanish bo'lmagan yo'llar.

---

## 4. Buni qanday takrorlash mumkin

```bash
# Sozlamalar to'g'rimi (chiqarishdan oldin)
npm run deploy:check

# Sayt tashqaridan qanday ko'rinadi (chiqarishdan keyin)
npm run smoke -- https://<domeningiz>

# Pul hisobi joyidami (balans = kirim - chiqim)
npm run money:check -- --prod

# Kod ichidagi qoidalar buzilmaganmi
npm test
```

Hujum simulyatsiyasi (44 ta tekshiruv) ishlab chiqish muhitida
bajariladi va har bir jiddiy o'zgarishdan keyin qayta ishga
tushiriladi.

---

## 5. Nima qilish kerak, agar hujum bo'lsa

1. **Barcha kalitlarni almashtiring** (yuqoridagi 3.1).
2. Admin panelda hujum qilgan hisobni bloklang — uning barcha
   sessiyalari **darhol** yopiladi.
3. `/admin/audit` da nima qilinganini ko'ring — audit jurnali
   o'chirilmaydi va o'zgartirilmaydi.
4. Zarur bo'lsa `/admin/errors` dagi yozuvlardan hujum yo'lini
   aniqlang.

**Balansni qo'lda tuzatib bo'lmaydi** — har bir pul harakati faqat
tranzaksiya orqali yoziladi. Bu ataylab: shunda hisobni doim
tekshirish mumkin.

# Bo'limlarni kengaytirish rejasi

Bu hujjat Navixning har bir bo'limini Feed darajasiga olib chiqish
rejasi. Feed 18 ta sahifadan iborat va u ishlaydi — qolgan bo'limlar
esa 3-7 ta sahifada qolib ketgan.

---

## 1. Hozirgi holat — o'lchangan, taxmin emas

| Bo'lim | Sahifalar | Holati |
|---|---|---|
| **Feed** | 18 | To'liq |
| Marketplace | 7 | Yarim |
| Hotel | 4 | Yarim |
| Travel | 4 | Yarim |
| Hamyon | 4 | Yetarli (u ko'p sahifa talab qilmaydi) |
| To'lovlar | 4 | Yetarli |
| Ovqat | 3 | Kam |
| Ish qidirish | 3 | Kam |

### 1.1. Eng katta kashfiyot: RASM UMUMAN YO'Q

Bazani tekshirdim. Quyidagi jadvallarning **hech birida rasm maydoni
yo'q**:

```
Product      — mahsulot rasmi YO'Q
MenuItem     — taom rasmi YO'Q
Hotel        — mehmonxona rasmi YO'Q
HotelRoom    — xona rasmi YO'Q
Restaurant   — restoran rasmi YO'Q
Shop         — do'kon rasmi YO'Q
Company      — kompaniya logotipi YO'Q
Vacancy      — YO'Q
```

Ularning o'rnida `color` maydoni bor — rangli kvadrat chiziladi.

**Bu nima degani:** hozir Navix marketplace'ida odam telefon g'ilofini
sotib olmoqchi bo'lsa, uning **qanday ko'rinishini umuman ko'ra
olmaydi**. Faqat nom va narx.

Hech bir savdo ilovasi bunday ishlamaydi. Instagram'da rasm bor —
lekin u yerda hech narsa sotilmaydi. Do'konda esa rasm **birinchi
o'rinda** turadi: odam avval ko'radi, keyin narxga qaraydi.

> Bu rejadagi **1-raqamli** ish. Qolgan hamma narsa undan keyin
> keladi, chunki rasmsiz sahifa qancha chiroyli bo'lmasin, mahsulot
> sotilmaydi.

### 1.2. Ikkinchi kashfiyot: REYTING SOXTA

`Restaurant`, `Shop` va `Hotel` jadvallarida `rating` va `ratingCount`
ustunlari bor. Lekin **`Review` jadvali umuman yo'q**.

Ya'ni bu raqamlarni faqat administrator qo'lda yozib qo'yishi mumkin.
Foydalanuvchi baho qoldira olmaydi.

Ekranda "4.8 ★ (127 baho)" turadi, lekin 127 ta baho hech qachon
bo'lmagan. **Bu yolg'on** va u aniqlanganda ilovaga bo'lgan ishonchni
butunlay yo'q qiladi.

Ikki yo'l bor: yo haqiqiy baho tizimini qurish, yo raqamni butunlay
olib tashlash. **Uchinchi yo'l yo'q.**

### 1.3. Uchinchi kashfiyot: SAVAT QURILMADA QOLADI

Savat `localStorage` da saqlanadi. Ya'ni:

- telefonda savatga solingan mahsulot kompyuterda **yo'q**;
- brauzer tozalansa savat **yo'qoladi**;
- "savatda 3 ta mahsulot bor" degan eslatma yuborib bo'lmaydi.

Kichik do'kon uchun bu yetarli, o'sayotgan marketplace uchun emas:
tashlab ketilgan savat — bu eng arzon savdo imkoniyati.

---

## 2. Gigantlardan nima olamiz

Har bir qarorning yonida **nima uchun aynan bu O'zbekistonga
to'g'ri keladi** degan sabab bor. Ko'r-ko'rona nusxa ko'chirish
yaramaydi.

| Manba | Nimani olamiz | Nima uchun bizga mos |
|---|---|---|
| **Amazon** | Mahsulot sahifasi tartibi: rasm → narx → **yetkazish sanasi** → sotib olish → tavsif → baholar → savollar | "Qachon yetib keladi?" — xaridorning 1-savoli. Amazon uni narxdan keyin darhol javob beradi |
| **Uzum / Wildberries** | Topshirish punktlari, o'lcham jadvali, sotuvchi reytingi, "kiyib ko'rish" | O'zbek xaridori buni **allaqachon o'rgangan**. Uyga yetkazish qimmat, punktga borish odat |
| **Ozon** | Taqqoslash, "arzonroq o'xshashi", narx tarixi | Narxga sezgirlik juda yuqori. "Bu arzonmi?" degan savolga javob kerak |
| **AliExpress** | Variantlar: rang va o'lcham, har biriga alohida rasm va ombor | Busiz sotuvchi bitta futbolkani 8 marta joylaydi va katalog axlatga aylanadi |
| **Yandex Eda / Glovo** | Buyurtma yo'li (timeline), kuryer xaritada, ETA | Odam "qayerda?" deb qo'ng'iroq qilmasligi uchun |
| **Booking.com** | Filtrlar hech qachon **bo'sh natija bermaydi**, xarita ko'rinishi, "bepul bekor qilish" belgisi | Mehmonxona ishonch bilan sotiladi. Bo'sh natija — sotuvning tugashi |
| **HeadHunter (hh.uz)** | Maosh filtri, saqlangan vakansiyalar, ariza holati | Ish qidiruvchi 20 ta ariza yuboradi va ularni **kuzatib turishi** kerak |

### 2.1. Gigantlardan NIMANI OLMAYMIZ

Bu ro'yxat yuqoridagidan **muhimroq**. Katta ilovalarning ko'p
qismi bizga zarar keltiradi:

| Nima | Nima uchun YO'Q |
|---|---|
| Chuqur kategoriya daraxti (Amazon: 8 daraja) | Bizda sotuvchi kam. 8 darajali daraxtning har bir bo'limi bo'sh ko'rinadi — bu "bu yerda hech narsa yo'q" degan taassurot beradi |
| Sun'iy intellekt tavsiyalari | Ma'lumot yo'q. Loyihada **LLM ishlatmaslik** qarori bor. Tavsiya uchun minglab xarid tarixi kerak |
| Ko'p omborli logistika | Ombor yo'q. Sotuvchi o'z uyidan jo'natadi |
| Auksion / narx taklifi | Xaridor kam. Auksionda 1-2 ishtirokchi bo'lsa, u kulgili ko'rinadi |
| Ball / keshbek tizimi | Bu **pul harakati**. Siz monetizatsiya kerak emas dedingiz va bu to'g'ri qaror — soliq va huquqiy masalalar ochiladi |
| "Yulduzli sotuvchi" darajalari | Sotuvchi kam. Darajalash ularni bo'lib tashlaydi va pastdagilar butunlay ko'rinmay qoladi |

---

## 3. Reja: bosqichlar

### Umumiy prinsip

Feed kuchli bo'lgani **sahifalar soni** uchun emas. Har bir sahifa
**bitta aniq savolga** javob beradi: "nima yangilik?", "kimni
kuzatyapman?", "nimani saqlagandim?".

Savdo bo'limlarida ham xuddi shunday bo'ladi.

### Poydevor: UMUMIY modullar (37–40)

Bular **bir marta** yoziladi va **hamma bo'lim** ishlatadi. Aks holda
mahsulot uchun bitta baho tizimi, mehmonxona uchun boshqasi, restoran
uchun uchinchisi yozilardi — va ularning uchtasida ham alohida xato
bo'lardi.

| # | Nima | Nima uchun birinchi |
|---|---|---|
| **37** | **Rasmlar tizimi** — mahsulot, taom, mehmonxona, xona, do'kon, restoran, kompaniya uchun. Galereya, tartib, asosiy rasm | Rasmsiz savdo yo'q. Yuklash mexanizmi allaqachon bor (post rasmlari), uni kengaytiramiz |
| **38** | **Baho va sharh** — bitta modul, hamma narsaga: mahsulot, do'kon, restoran, taom, mehmonxona, kuryer. Faqat **haqiqiy xaridor** baho qo'ya oladi | Soxta reytingni tuzatadi. "Faqat xaridor" qoidasi — soxta bahoning oldini oladigan yagona ishonchli usul |
| **39** | **Sevimlilar** — bitta modul: mahsulot, mehmonxona, vakansiya, restoran, taom | Odam "keyin sotib olaman" deydi. Busiz u mahsulotni yo'qotadi va qaytmaydi |
| **40** | **Yaqinda ko'rilganlar** — avtomatik, sozlamasiz | Eng kuchli qaytarish vositasi. Amazon savdosining katta qismi shu yo'ldan keladi |

### Marketplace (41–46)

| # | Sahifa / imkoniyat | Qaysi gigantdan |
|---|---|---|
| **41** | **Mahsulot sahifasini qayta qurish**: galereya → narx → **yetkazish sanasi** → savatga → tavsif → xususiyatlar → baholar → savol-javob | Amazon tartibi |
| **42** | **Variantlar**: rang, o'lcham. Har biriga alohida ombor va rasm. O'lcham jadvali | AliExpress + Uzum |
| **43** | **Qidiruv va filtrlar**: narx oralig'i, kategoriya, sotuvchi, reyting, omborda bor, saralash. **Filtr bo'sh natija bermaydi** — har bir variant yonida soni turadi | Booking prinsipi |
| **44** | **Sotuvchi do'koni**: sarlavha rasmi, reyting, "sotuvchi haqida", barcha mahsulotlari, javob berish tezligi | Wildberries |
| **45** | **Savat serverga ko'chadi** + "keyinroq sotib olaman" ro'yxati + savat eslatmasi | Amazon |
| **46** | **Buyurtma yo'li**: qadamlar chizig'i, holat o'zgarishi, qaytarish so'rovi | Ozon |

**Natijada marketplace sahifalari (7 → 16):**

```
marketplace                    (bor)  → filtrlar qo'shiladi
marketplace/search             YANGI  filtrli qidiruv
marketplace/c/[slug]           (bor)  → filtrlar qo'shiladi
marketplace/p/[slug]           (bor)  → butunlay qayta quriladi
marketplace/p/[slug]/reviews   YANGI  barcha baholar
marketplace/p/[slug]/questions YANGI  savol-javob
marketplace/s/[slug]           (bor)  → sotuvchi sahifasi kuchayadi
marketplace/s/[slug]/reviews   YANGI  sotuvchi baholari
marketplace/cart               (bor)  → serverga ko'chadi
marketplace/saved              YANGI  keyinroq sotib olaman
marketplace/favorites          YANGI  sevimlilar
marketplace/recent             YANGI  yaqinda ko'rilganlar
marketplace/compare            YANGI  taqqoslash
marketplace/orders             (bor)
marketplace/orders/[id]        (bor)  → qadamlar chizig'i qo'shiladi
marketplace/orders/[id]/return YANGI  qaytarish
```

### Ovqat (47–48)

| # | Nima |
|---|---|
| **47** | Restoran sahifasi: rasmlar, mashhur taomlar, baholar, ish vaqti, "taom tarkibi" |
| **48** | Buyurtma kuzatuvi: qadamlar, kuryer xaritada, ETA. **"Buyurtmani takrorlash"** tugmasi |

`food: 3 → 8 sahifa`

### Mehmonxona (49–50)

| # | Nima |
|---|---|
| **49** | Filtrlar (narx, yulduz, qulayliklar, tuman), **xarita ko'rinishi**, rasm galereyasi |
| **50** | Baholar, bekor qilish shartlari, xona taqqoslash |

`hotel: 4 → 9 sahifa`

### Sayohat (51)

| # | Nima |
|---|---|
| **51** | O'rindiq tanlash, yo'nalish xaritasi, chipta sahifasi (QR), qaytish reysi |

`travel: 4 → 8 sahifa`

### Ish qidirish (52)

| # | Nima |
|---|---|
| **52** | Kompaniya sahifasi, maosh filtri, saqlangan vakansiyalar, ariza holati kuzatuvi, "menga o'xshash vakansiyalar" |

`jobs: 3 → 8 sahifa`

### Umumiy yakun (53)

| # | Nima |
|---|---|
| **53** | **Yagona qidiruv**: bitta maydondan mahsulot, taom, mehmonxona, vakansiya, odam va xabar topiladi. Bo'limlar bo'yicha guruhlangan natija |

---

## 4. Halol baholash

**Bu 17 ta bosqich.** Har biri avvalgi bosqichlar kabi: kod + test +
E2E + ekran surati + hisobot.

**Eng og'ir uchtasi:**

1. **37 (rasmlar)** — bazaga 7 ta jadvalga ustun qo'shiladi, yuklash
   oqimi kengaytiriladi, admin va sotuvchi kabinetlariga rasm
   boshqaruvi qo'shiladi. Mavjud ma'lumot buzilmasligi kerak.
2. **42 (variantlar)** — mahsulot modelining tuzilishi o'zgaradi.
   Savat, buyurtma va ombor hisobi ham o'zgaradi. Eng ko'p joyga
   tegadigan bosqich.
3. **45 (savat serverga)** — savat moliyaviy hujjatga yaqinlashadi.
   Bir vaqtda ikki qurilmadan o'zgartirish, ombor tugab qolishi va
   narx o'zgarishi holatlari hisobga olinishi kerak.

**Eng tez foyda beradigan uchtasi:**

1. **37 (rasmlar)** — darhol ko'rinadi va darhol ishonch beradi.
2. **43 (filtrlar)** — odam kerakli narsani topa boshlaydi.
3. **40 (yaqinda ko'rilganlar)** — odamni qaytaradi, hech qanday
   sozlash talab qilmaydi.

---

## 5. Tavsiya etilgan tartib

Agar hammasini birdan qilish uzoq bo'lsa, quyidagi **beshtasi** eng
katta farqni beradi:

```
37  Rasmlar          ← bularsiz qolgani ma'nosiz
38  Baho va sharh    ← soxta reytingni tuzatadi
41  Mahsulot sahifasi
43  Qidiruv va filtrlar
40  Yaqinda ko'rilganlar
```

Bu beshtadan keyin Navix marketplace'i **haqiqiy do'kon** bo'lib
ko'rinadi. Qolgan 12 tasi esa uni yaxshilaydi, lekin poydevor
allaqachon turgan bo'ladi.

---

## 6. Bir narsani ochiq aytaman

Bu rejadagi ishlarning katta qismi **yangi imkoniyat emas** — ular
mavjud bo'limlardagi **bo'shliqlarni** to'ldiradi.

Marketplace bo'limi bor, lekin unda rasm yo'q. Reyting ko'rsatiladi,
lekin u soxta. Savat bor, lekin u qurilmada qoladi.

Yangi bo'lim qo'shishdan ko'ra, borini **oxirigacha yetkazish**
qimmatliroq. Yarim ishlaydigan o'nta bo'lim — bitta ham to'liq
ishlamaydigan ilova degani.

/**
 * Bosh ekran foni — premium natural qatlam.
 *
 * ── Nima uchun `AuroraBackground` dan alohida ─────────────────────────
 * Shafaq foni butun ilovada ishlatiladi: kirish sahifasida, AI
 * bo'limida. Uning rangi ko'k va binafsha — brend rangi.
 *
 * Bosh ekran esa boshqa vazifani bajaradi: odam ilovani BIRINCHI
 * marta ko'radi va bir necha soniyada "bu jiddiy ilovami?" degan
 * qarorga keladi. Shu sababli bu yerda tabiiy palitra: qaymoq,
 * moyil yashil va yog'och rangi.
 *
 * Umumiy fonni o'zgartirsak, butun ilova o'zgarib ketardi. Shuning
 * uchun bu qatlam alohida va faqat shu ekranda ishlatiladi.
 *
 * ── Nima uchun dog'lar deyarli ko'rinmaydi ────────────────────────────
 * Ular rang emas, HAVO berish uchun. Yorqin dog' fonni "bezak"ka
 * aylantiradi va matnni o'qishga xalaqit beradi. Zo'rg'a seziladigan
 * dog' esa fonni tekis qog'ozdan tirik yuzaga aylantiradi.
 *
 * ── Nima uchun toza CSS ───────────────────────────────────────────────
 * Butun effekt — bir nechta `blur` va `transform`. 3D kutubxona
 * yuzlab kilobayt qo'shardi va arzon telefonda batareyani yeb
 * qo'yardi. Harakat esa faqat `transform` orqali, ya'ni GPU'da.
 */

interface Shape {
  className: string;
  delaySeconds: number;
}

/**
 * Fondagi uchta dog'.
 *
 * Uchtadan ko'p bo'lsa fon shovqinga aylanadi; kamroq bo'lsa
 * harakat sezilmaydi. Har biri o'z vaqtida suziladi — aks holda
 * ular birgalikda "nafas olayotgandek" ko'rinardi.
 */
const SHAPES: readonly Shape[] = [
  {
    className: 'hero-glow hero-glow-ivory -top-32 -left-24 size-[26rem] sm:size-[34rem]',
    delaySeconds: 0,
  },
  {
    className: 'hero-glow hero-glow-sage -top-16 -right-28 size-[24rem] sm:size-[30rem]',
    delaySeconds: -9,
  },
  {
    className: 'hero-glow hero-glow-oak bottom-[-12rem] left-1/4 size-[22rem] sm:size-[28rem]',
    delaySeconds: -17,
  },
];

export function HeroBackdrop() {
  return (
    <div className="hero-backdrop pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {SHAPES.map((shape) => (
        <div
          key={shape.className}
          className={`${shape.className} animate-hero-drift`}
          style={{ animationDelay: `${shape.delaySeconds}s` }}
        />
      ))}

      {/*
        Yuqori chekka umumiy fonga singib ketadi.

        Bo'lim yopishqoq panel OSTIDAN boshlanadi. Panelning rangi
        umumiy fon, bo'limniki esa iliq matte — ular tutashgan joyda
        ko'zga tashlanadigan chiziq paydo bo'lardi. Buni ekran
        suratida ko'rdim va brauzerdan ranglarni o'lchab tasdiqladim.

        Panelni bo'yash ham mumkin edi, lekin u butun sahifa bo'ylab
        yopishib yuradi: pastga surilganda panel bilan sahifa orasida
        xuddi shu chiziq paydo bo'lardi. Shuning uchun chegara emas,
        BO'LIMNING o'zi yumshoq boshlanadi.
      */}
      <div className="from-background absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent" />

      {/*
        Pastki chekka yumshoq qorayadi.

        Bu bo'lim keyingisiga "kesilib" o'tmasligi uchun: chegara
        aniq chiziq bo'lsa, ekran ikkiga bo'lingandek ko'rinardi.
      */}
      <div className="to-background absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent" />
    </div>
  );
}

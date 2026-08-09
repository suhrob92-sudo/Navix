import type { SVGProps } from 'react';

/**
 * Navix brend belgisi — "N" harfi va uchta uchqun.
 *
 * ── Nima uchun rasm emas, SVG ─────────────────────────────────────────
 * Belgi ilovada eng kichigi 20px, eng kattasi 96px o'lchamda chiziladi.
 * PNG bo'lganda bir o'lchamda aniq, qolganlarida xira ko'rinardi va
 * Retina ekranlar uchun uch xil nusxa saqlashga to'g'ri kelardi.
 * SVG esa bitta fayl bo'lib, har qanday o'lchamda toza qoladi.
 *
 * ── Nima uchun fon yo'q ───────────────────────────────────────────────
 * Bu komponent FAQAT belgining o'zini chizadi — gradientli dumaloq yoki
 * kvadrat fonni chaqiruvchi tomon beradi. Sababi: pastki panelda dumaloq,
 * sarlavhada esa yumaloq kvadrat kerak. Fon ichkariga qotirilsa, ikkita
 * deyarli bir xil komponent yuritishga majbur bo'lardik.
 *
 * ── Nima uchun `currentColor` ─────────────────────────────────────────
 * Rang qotirilmagan: ota-element `text-primary-foreground` desa oq,
 * `text-primary` desa ko'k bo'ladi. Shu tufayli yorug' va qorong'i
 * mavzuda alohida nusxa kerak emas.
 *
 * Koordinatalar 24×24 to'rda — loyihadagi boshqa ikonkalar bilan bir xil,
 * shuning uchun `size-6` kabi sinflar bir xil ishlaydi.
 */
export function NavixMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <g transform="translate(-1.4 0.9)">
        {/*
          "N" — bitta uzluksiz chiziq: chapdan yuqoriga, diagonal bo'ylab
          pastga, so'ng o'ngdan yuqoriga. O'ng ustun ataylab kaltaroq:
          uning tepasidagi joyni katta uchqun egallaydi.
        */}
        <path
          d="M6.4 18.1V8.2L14 18.1v-7.2"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Katta uchqun — "N" ning o'ng yelkasi ustida. */}
        <path
          d="M16.6 3.9c0 2.325-.775 3.1-3.1 3.1 2.325 0 3.1.775 3.1 3.1 0-2.325.775-3.1 3.1-3.1-2.325 0-3.1-.775-3.1-3.1Z"
          fill="currentColor"
        />

        {/* O'rtacha uchqun — yuqori o'ng burchakda. */}
        <path
          d="M20.2 2c0 1.425-.475 1.9-1.9 1.9 1.425 0 1.9.475 1.9 1.9 0-1.425.475-1.9 1.9-1.9-1.425 0-1.9-.475-1.9-1.9Z"
          fill="currentColor"
        />

        {/* Kichik uchqun — pastroqda, uchburchak muvozanatni yopadi. */}
        <path
          d="M20.4 9c0 1.2-.4 1.6-1.6 1.6 1.2 0 1.6.4 1.6 1.6 0-1.2.4-1.6 1.6-1.6-1.2 0-1.6-.4-1.6-1.6Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}

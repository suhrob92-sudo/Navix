'use client';

import qrcode from 'qrcode-generator';
import { useMemo } from 'react';

import { QR_ERROR_LEVEL, ticketQrPayload } from '@/config/qr-ticket';
import { cn } from '@/lib/utils';

/**
 * Chiptaning QR kodi.
 *
 * ── Nima uchun SVG, rasm emas ─────────────────────────────────────────
 * QR kodi — qora va oq kvadratchalar to'ri. Rasm (PNG) sifatida
 * chizilsa, u ekran zichligiga bog'liq bo'lib qoladi va telefonda
 * chetlar xiralashadi — skaner esa aynan chetlarga qarab o'qiydi.
 *
 * SVG har qanday o'lchamda ANIQ qoladi va u sahifaning o'zida
 * chiziladi: hech qanday so'rov, hech qanday kutish.
 *
 * ── Nima uchun tayyor kutubxona ishlatildi ────────────────────────────
 * QR kodini yasash oddiy ish emas: unda Rid-Solomon xato tuzatish
 * kodlari bor va ularni qo'lda yozish yuzlab qator murakkab
 * matematika degani.
 *
 * Bu yerda xato "kod biroz noto'g'ri chizildi" degani emas — kod
 * umuman o'qilmaydi va buni faqat vokzalda, nazoratchi oldida
 * bilib olishardi.
 *
 * `qrcode-generator` — 25 yildan beri ishlatiladigan, bog'liqliksiz
 * kutubxona (MIT). Ishlatilgani FAQAT shu fayl: ertaga boshqasiga
 * o'tilsa, o'zgarish shu yerda qoladi.
 */

export interface TicketQrProps {
  ticketNumber: string;
  /** Kod o'lchami — PIKSELDA. */
  size?: number;
  className?: string;
}

export function TicketQr({ ticketNumber, size = 200, className }: TicketQrProps) {
  const path = useMemo(() => {
    /*
      `0` — versiyani KUTUBXONA tanlaydi: matn uzunligiga qarab eng
      kichigi olinadi. Qo'lda qo'yilsa, uzunroq chipta raqami
      sig'may qolardi.
    */
    const qr = qrcode(0, QR_ERROR_LEVEL);

    qr.addData(ticketQrPayload(ticketNumber));
    qr.make();

    const count = qr.getModuleCount();

    /*
      Har bir qora modul — bitta kvadrat. Ularni BITTA `path`
      ichida yig'amiz: alohida `rect` elementlari bo'lsa, o'rtacha
      QR uchun mingga yaqin element chiziladi va sahifa sekinlashadi.
    */
    const parts: string[] = [];

    for (let row = 0; row < count; row += 1) {
      for (let column = 0; column < count; column += 1) {
        if (qr.isDark(row, column)) parts.push(`M${column} ${row}h1v1h-1z`);
      }
    }

    return { d: parts.join(''), count };
  }, [ticketNumber]);

  return (
    <svg
      /*
        `viewBox` modullar soniga teng: shunda kod istalgan
        o'lchamda aniq chiziladi va yaxlitlash xatosi bo'lmaydi.

        Atrofdagi bitta modullik bo'sh joy ("quiet zone") standart
        talabi: usiz skaner kodning chegarasini topa olmaydi.
      */
      viewBox={`-1 -1 ${path.count + 2} ${path.count + 2}`}
      width={size}
      height={size}
      role="img"
      aria-label={`Chipta QR kodi: ${ticketNumber}`}
      className={cn('rounded-xl bg-white p-2', className)}
      shapeRendering="crispEdges"
    >
      {/*
        Fon HAR DOIM oq, matn har doim qora — qorong'i rejimda ham.

        Sabab: skanerlar aynan shu qarama-qarshilikni kutadi.
        Teskari rangdagi QR ni ko'p skaner umuman o'qimaydi.
      */}
      <rect x={-1} y={-1} width={path.count + 2} height={path.count + 2} fill="#ffffff" />
      <path d={path.d} fill="#000000" />
    </svg>
  );
}

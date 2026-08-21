import { ImageResponse } from 'next/og';

import { siteConfig } from '@/config/site';
import { loadSharePreview } from '@/modules/feed/share-preview.service';

/**
 * BITTA POST uchun ulashish rasmi.
 *
 * ── Nima uchun umumiy rasmdan alohida ─────────────────────────────────
 * Ildizdagi rasm butun ilova haqida: "Navix — super ilova". Post
 * havolasi bilan ulashilganda esa odam AYNAN o'sha postni ko'rmoqchi:
 * kim yozgan, nima haqida.
 *
 * Bir xil rasm bo'lsa, Telegramda o'nta turli video bir xil kulrang
 * kartochka bo'lib chiqardi va hech kim qaysi biri qiziqligini
 * bilmasdi.
 *
 * ── Nima uchun POSTNING O'Z rasmi ishlatilmaydi ───────────────────────
 * Uni ham qo'yish mumkin edi, lekin ikkita jiddiy muammo bor.
 *
 * Birinchisi — XAVFSIZLIK: yopiq hisobning rasmi ochiq havola
 * orqali tarqalib ketardi.
 *
 * Ikkinchisi — TEZLIK: har bir ulashilgan havolada ombordagi rasm
 * yuklab olinib, qayta chizilardi. Telegram esa havolani MING
 * marta ochishi mumkin (har bir chatda alohida).
 *
 * Matn va rang esa bir lahzada chiziladi va hech narsani oshkor
 * qilmaydi.
 */
export const alt = 'Navixdagi post';

export const size = { width: 1200, height: 630 };

export const contentType = 'image/png';

interface Props {
  params: { id: string };
}

export default async function PostOpengraphImage({ params }: Props) {
  const preview = await loadSharePreview(params.id);

  const heading = preview?.authorName ?? siteConfig.name;
  const body = preview?.description ?? siteConfig.tagline;

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        background: 'linear-gradient(135deg, #314df5 0%, #7c3aed 100%)',
        color: '#ffffff',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '72px',
            height: '72px',
            borderRadius: '22px',
            background: 'rgba(255, 255, 255, 0.16)',
            fontSize: '42px',
            fontWeight: 700,
          }}
        >
          N
        </div>

        <div style={{ display: 'flex', fontSize: '34px', fontWeight: 600, opacity: 0.92 }}>{siteConfig.name}</div>

        {/*
            Video belgisi — kartochkada DARHOL ko'rinadi.

            Odam havolani bosishdan oldin nima kutayotganini bilishi
            kerak: matn o'qishmi yoki video ko'rishmi. Bu ikki xil
            holat va ikki xil vaqt.
          */}
        {preview?.isVideo && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              borderRadius: '999px',
              background: 'rgba(255, 255, 255, 0.18)',
              padding: '8px 22px',
              fontSize: '26px',
            }}
          >
            Video
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', fontSize: '56px', fontWeight: 700 }}>{heading}</div>

        {/*
            Matn UCH QATORGA cheklangan.

            `ImageResponse` da matn o'zi kesilmaydi: uzun matn
            rasmning pastidan chiqib ketardi va oxiri butunlay
            ko'rinmasdi.
          */}
        <div
          style={{
            display: 'flex',
            fontSize: '36px',
            marginTop: '20px',
            opacity: 0.9,
            lineHeight: 1.4,
            maxHeight: '160px',
            overflow: 'hidden',
          }}
        >
          {body}
        </div>
      </div>

      <div style={{ display: 'flex', fontSize: '26px', opacity: 0.75 }}>
        Ko&apos;rish uchun Navix&apos;ga kiring
      </div>
    </div>,
    size,
  );
}

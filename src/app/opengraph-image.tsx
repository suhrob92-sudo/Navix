import { ImageResponse } from 'next/og';

import { siteConfig } from '@/config/site';

/**
 * Havola ulashilganda ko'rinadigan rasm.
 *
 * ── Nima uchun bu MUHIM ───────────────────────────────────────────────
 * Navix havolasi Telegram, Instagram va WhatsApp orqali tarqaladi.
 * Rasm bo'lmasa, havola kulrang, nomsiz to'rtburchak bo'lib ko'rinadi
 * va uni hech kim bosmaydi.
 *
 * ── Nima uchun tayyor PNG emas, KOD ───────────────────────────────────
 * Tayyor rasm har o'zgarishda grafik muharrirda qayta chizilishi
 * kerak bo'lardi — telefondan ishlayotgan odam uchun bu deyarli
 * imkonsiz. Bu yerda esa matnni o'zgartirish bir qator kod.
 *
 * ── Nima uchun oddiy shriftlar ────────────────────────────────────────
 * `ImageResponse` faqat unga BERILGAN shriftlardan foydalanadi. Maxsus
 * shrift fayli qo'shilsa, u har rasm yasashda o'qilardi va build
 * hajmini oshirardi. Tizim shrifti esa bepul va yetarli — bu rasmda
 * matn kam.
 */
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;

export const size = { width: 1200, height: 630 };

export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px',
        /*
            Gradient ilovadagi asosiy ranglar bilan bir xil: havolani
            ko'rgan odam ilovani ochganda o'sha rangni ko'radi.
          */
        background: 'linear-gradient(135deg, #314df5 0%, #7c3aed 100%)',
        color: '#ffffff',
        fontFamily: 'sans-serif',
      }}
    >
      {/* Brend belgisi */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '96px',
          height: '96px',
          borderRadius: '28px',
          background: 'rgba(255, 255, 255, 0.16)',
          fontSize: '56px',
          fontWeight: 700,
        }}
      >
        N
      </div>

      <div style={{ display: 'flex', fontSize: '84px', fontWeight: 700, marginTop: '48px' }}>
        {siteConfig.name}
      </div>

      <div style={{ display: 'flex', fontSize: '40px', marginTop: '16px', opacity: 0.92 }}>
        {siteConfig.tagline}
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: '28px',
          marginTop: '40px',
          opacity: 0.8,
          maxWidth: '900px',
          lineHeight: 1.4,
        }}
      >
        Taksi, ovqat, marketplace, to&apos;lovlar, ish va sayohat — bitta ilovada
      </div>
    </div>,
    size,
  );
}

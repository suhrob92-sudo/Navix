'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/**
 * ENG YUQORI darajadagi xato ekrani.
 *
 * ── `error.tsx` dan farqi ─────────────────────────────────────────────
 * `error.tsx` sahifa ichidagi xatoni ushlaydi va ilova qobig'i
 * (sarlavha, menyu) joyida qoladi.
 *
 * Bu fayl esa QOBIQNING O'ZI ishdan chiqqanda ishlaydi. O'shanda
 * hech narsa qolmaydi — shuning uchun bu yerda o'z `<html>` va
 * `<body>` yoziladi.
 *
 * ── Nima uchun uslub ICHKARIDA yozilgan ───────────────────────────────
 * Bu ekran chizilayotganda ilovaning CSS fayli yuklanmagan bo'lishi
 * mumkin (aynan shu yuklanmaganlik xatoning sababi bo'lishi ham
 * mumkin). Tailwind sinflari ishlatilsa, foydalanuvchi bezaksiz,
 * o'qib bo'lmaydigan matnni ko'rardi.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    // Bu darajadagi xato eng jiddiysi — u albatta yozib olinishi kerak.
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="uz">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          background: '#fbfbfd',
          color: '#0d0e14',
        }}
      >
        <div style={{ maxWidth: '28rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Ilova ochilmadi</h1>

          <p style={{ marginTop: '0.75rem', lineHeight: 1.6, color: '#5b5f6b' }}>
            Kutilmagan xatolik yuz berdi. Sahifani qayta yuklab ko&apos;ring. Muammo takrorlansa, bizga xabar
            bering.
          </p>

          {error.digest && (
            <p style={{ marginTop: '1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#8a8f9c' }}>
              Xatolik kodi: {error.digest}
            </p>
          )}

          {/*
            `<Link>` EMAS, oddiy `<a>`.

            Bu ekran ilovaning qobig'i ishdan chiqqanda chiziladi —
            ya'ni React yo'naltiruvchisi (router) ishonchsiz holatda.
            Oddiy havola sahifani TO'LIQ qayta yuklaydi va shu bilan
            buzilgan holatdan butunlay chiqib ketadi.
          */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              display: 'inline-block',
              marginTop: '1.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              background: '#4f46e5',
              color: '#ffffff',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Bosh sahifaga
          </a>
        </div>
      </body>
    </html>
  );
}

'use client';

import Link from 'next/link';

import { parseRichText } from '@/modules/feed/feed.text';

export interface RichTextProps {
  body: string;
  /** Havolalar rangi — qora fonda (video ustida) boshqacha bo'ladi. */
  tone?: 'DEFAULT' | 'ON_MEDIA';
}

/**
 * Post matni — xeshteg, eslash va havolalar bosiladigan qilib.
 *
 * ── Nima uchun HTML yasalmaydi ────────────────────────────────────────
 * Matnni HTML ga aylantirish eng oson yo'l edi, lekin unda odam
 * yozgan `<script>` ham HTML bo'lib ishga tushardi — ya'ni har bir
 * post boshqa odamlarning brauzerida kod bajarishi mumkin edi.
 *
 * Bu yerda esa React har bo'lakni MATN sifatida chizadi va hech
 * qanday teg hosil bo'lmaydi.
 *
 * ── Nima uchun tashqi havola YANGI oynada ochiladi ────────────────────
 * Odam lentani o'qiyotgan edi. Havola shu oynada ochilsa, u lentadan
 * chiqib ketardi va qaytib kelganda o'qigan joyini yo'qotardi.
 *
 * `rel="noopener noreferrer"` — ochilgan sahifa bizning oynamizga
 * murojaat qila olmasligi uchun.
 */
export function RichText({ body, tone = 'DEFAULT' }: RichTextProps) {
  const linkClass = tone === 'ON_MEDIA' ? 'font-medium text-sky-300' : 'text-primary font-medium';

  return (
    <>
      {parseRichText(body).map((token, index) => {
        if (token.kind === 'TEXT' || token.href === null) {
          return <span key={index}>{token.text}</span>;
        }

        if (token.kind === 'LINK') {
          return (
            <a
              key={index}
              href={token.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkClass} break-all hover:underline`}
              onClick={(event) => event.stopPropagation()}
            >
              {token.text}
            </a>
          );
        }

        return (
          <Link
            key={index}
            href={token.href}
            className={`${linkClass} hover:underline`}
            onClick={(event) => event.stopPropagation()}
          >
            {token.text}
          </Link>
        );
      })}
    </>
  );
}

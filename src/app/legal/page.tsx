import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { LEGAL_DOCUMENTS, legalHref } from '@/config/legal';
import { LEGAL_ENTITY } from '@/config/legal/company';
import { Card } from '@/components/ui/card';
import { formatUzDate } from '@/lib/date';

export const metadata: Metadata = {
  title: 'Huquqiy hujjatlar',
  description:
    'Foydalanish shartlari, maxfiylik siyosati va ommaviy oferta — ilovadan foydalanish va xarid qilish qoidalari.',
  alternates: { canonical: '/legal' },
};

export default function LegalIndexPage() {
  return (
    <div className="animate-fade-up">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Huquqiy hujjatlar</h1>
      <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
        Ilovadan foydalanish, ma&apos;lumotlaringiz va xarid shartlari shu uchta hujjatda yozilgan. Ular oddiy
        tilda yozilgan — yuridik ta&apos;lim talab qilmaydi.
      </p>

      <div className="mt-10 space-y-4">
        {LEGAL_DOCUMENTS.map((document) => {
          const Icon = document.icon;

          return (
            <Link key={document.slug} href={legalHref(document.slug)} className="block">
              <Card interactive className="flex items-start gap-4">
                <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="size-5" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold">{document.title}</h2>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{document.summary}</p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    Yangilangan:{' '}
                    <time dateTime={document.updatedAt}>{formatUzDate(document.updatedAt, 'long')}</time>
                  </p>
                </div>

                <ArrowRight className="text-muted-foreground mt-1 size-4 shrink-0" aria-hidden="true" />
              </Card>
            </Link>
          );
        })}
      </div>

      <p className="text-muted-foreground mt-10 text-sm leading-relaxed">
        Hujjatlar bo&apos;yicha savolingiz bo&apos;lsa:{' '}
        <a href={`mailto:${LEGAL_ENTITY.email}`} className="text-primary hover:underline">
          {LEGAL_ENTITY.email}
        </a>
      </p>
    </div>
  );
}

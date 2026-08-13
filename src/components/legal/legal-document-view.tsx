import { AlertTriangle, Info } from 'lucide-react';

import { hasFullRequisites, requisiteRows } from '@/config/legal/company';
import { Badge } from '@/components/ui/badge';
import { formatUzDate } from '@/lib/date';
import type { LegalBlock, LegalDocument } from '@/config/legal/legal.types';

/**
 * Huquqiy hujjatni ekranga chiqaradi.
 *
 * ── Nima uchun bitta komponent ────────────────────────────────────────
 * Uchta hujjat ham bir xil ko'rinishi kerak: bir xil sarlavha o'lchami,
 * bir xil mundarija, bir xil jadval. Har biri alohida sahifa bo'lganda
 * ular asta-sekin bir-biridan ajralib ketardi.
 *
 * ── Nima uchun mundarija YASALADI ─────────────────────────────────────
 * Bo'limlar ro'yxati hujjatning o'z bo'limlaridan olinadi. Yangi bo'lim
 * qo'shilganda mundarijani yangilash esdan chiqmaydi — u shunchaki
 * mavjud emas.
 */
export interface LegalDocumentViewProps {
  document: LegalDocument;
}

export function LegalDocumentView({ document }: LegalDocumentViewProps) {
  const Icon = document.icon;
  const requisitesMissing = document.requiresRequisites === true && !hasFullRequisites();

  return (
    <article className="animate-fade-up">
      <header className="mb-10">
        <div className="mb-4 flex items-center gap-3">
          <span className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-xl">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <Badge variant="outline">
            Yangilangan: <time dateTime={document.updatedAt}>{formatUzDate(document.updatedAt, 'long')}</time>
          </Badge>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{document.title}</h1>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">{document.summary}</p>
      </header>

      {requisitesMissing && (
        <div className="border-warning/40 bg-warning/10 mb-10 flex gap-3 rounded-xl border p-4">
          <AlertTriangle className="text-warning mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div className="space-y-1 text-sm leading-relaxed">
            <p className="font-medium">Hujjat loyihasi</p>
            <p className="text-muted-foreground">
              Tashkilotning rasmiy rekvizitlari (STIR, yuridik manzil, hisob raqami) davlat ro&apos;yxatidan
              o&apos;tish yakunlangach to&apos;ldiriladi. Shu paytgacha ushbu hujjat tanishtiruv sifatida
              e&apos;lon qilingan.
            </p>
          </div>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">
        <nav aria-label="Mundarija" className="mb-10 lg:mb-0">
          {/*
            Mundarija kompyuterda YOPISHIB turadi: hujjat uzun va odam
            o'qish paytida qayerda ekanini yo'qotmasligi kerak.
            Telefonda esa oddiy ro'yxat — yopishgan blok ekranning
            yarmini egallab qo'yardi.
          */}
          <div className="border-border/60 bg-card/50 rounded-xl border p-4 lg:sticky lg:top-24">
            <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">Mundarija</p>
            <ol className="space-y-1.5">
              {document.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-muted-foreground hover:text-foreground block text-sm leading-snug transition-colors"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <div className="min-w-0 space-y-10">
          {document.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="mb-4 text-xl font-semibold tracking-tight">{section.title}</h2>
              <div className="space-y-4">
                {section.blocks.map((block, index) => (
                  <LegalBlockView key={index} block={block} />
                ))}

                {/* Rekvizitlar sozlamadan olinadi — matnga qo'lda yozilmaydi. */}
                {section.id === 'rekvizitlar' && <RequisitesTable />}
              </div>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
}

function LegalBlockView({ block }: { block: LegalBlock }) {
  if (block.kind === 'text') {
    return <p className="text-muted-foreground leading-relaxed">{block.value}</p>;
  }

  if (block.kind === 'list') {
    return (
      <ul className="space-y-2.5">
        {block.items.map((item, index) => (
          <li key={index} className="text-muted-foreground flex gap-3 leading-relaxed">
            <span className="bg-primary/60 mt-2.5 size-1.5 shrink-0 rounded-full" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === 'note') {
    return (
      <div className="border-primary/30 bg-primary/5 flex gap-3 rounded-xl border p-4">
        <Info className="text-primary mt-0.5 size-4.5 shrink-0" aria-hidden="true" />
        <p className="text-sm leading-relaxed">{block.value}</p>
      </div>
    );
  }

  return <LegalTable head={block.head} rows={block.rows} />;
}

/**
 * Jadval.
 *
 * Kenglik yetmasa jadval O'Z ichida suriladi (`overflow-x-auto`) —
 * aks holda telefonda butun sahifa yon tomonga surilib ketardi.
 */
function LegalTable({ head, rows }: { head: readonly string[]; rows: readonly (readonly string[])[] }) {
  return (
    <div className="border-border/60 overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[30rem] border-collapse text-sm">
        <thead>
          <tr className="border-border/60 bg-muted/40 border-b">
            {head.map((cell) => (
              <th key={cell} scope="col" className="px-4 py-3 text-left font-semibold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-border/40 last:border-0 border-b">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={
                    cellIndex === 0
                      ? 'px-4 py-3 align-top font-medium'
                      : 'text-muted-foreground px-4 py-3 align-top leading-relaxed'
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequisitesTable() {
  return <LegalTable head={["Ma'lumot", 'Qiymat']} rows={requisiteRows().map(([label, value]) => [label, value])} />;
}

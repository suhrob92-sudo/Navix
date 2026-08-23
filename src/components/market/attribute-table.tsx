'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { VISIBLE_ATTRIBUTES, moreAttributesText } from '@/config/product-detail';
import { cn } from '@/lib/utils';

/**
 * Xususiyatlar jadvali.
 *
 * ── Nima uchun jadval, ro'yxat emas ───────────────────────────────────
 * "Ekran: 6.6 dyuym" degan qator ham ishlardi, lekin bir necha
 * qator yonma-yon turganda nom va qiymat aralashib ketardi.
 *
 * Ikki ustun esa ko'z bilan tez o'qiladi: chapda nima, o'ngda
 * qancha.
 *
 * ── Nima uchun bir qismi YOPIQ turadi ─────────────────────────────────
 * 20 qatorlik jadval telefon ekranining butun balandligini
 * egallaydi va uning ostidagi baholar bo'limiga hech kim yetib
 * bormaydi.
 */

export interface AttributeTableProps {
  attributes: { id: string; name: string; value: string }[];
  className?: string;
}

export function AttributeTable({ attributes, className }: AttributeTableProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (attributes.length === 0) return null;

  const visible = isExpanded ? attributes : attributes.slice(0, VISIBLE_ATTRIBUTES);
  const hidden = attributes.length - visible.length;

  return (
    <section className={cn('bg-card border-border rounded-2xl border p-4', className)}>
      <h2 className="mb-3 text-sm font-semibold">Xususiyatlar</h2>

      <dl className="space-y-2">
        {visible.map((attribute) => (
          <div key={attribute.id} className="flex items-baseline gap-3 text-sm">
            {/*
              Nom kengligi CHEKLANGAN: aks holda uzun nom qiymatni
              chetga surib yuborardi va jadval buzilardi.
            */}
            <dt className="text-muted-foreground w-32 shrink-0 leading-snug">{attribute.name}</dt>
            <dd className="min-w-0 flex-1 leading-snug break-words">{attribute.value}</dd>
          </div>
        ))}
      </dl>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="text-primary mt-3 inline-flex items-center gap-1 text-xs font-medium"
        >
          {moreAttributesText(hidden)}
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

'use client';

import { Check, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { dialogCancelHandler } from '@/lib/dialog';
import { cn } from '@/lib/utils';
import {
  ATTACHMENT_KINDS,
  ATTACHMENT_KIND_CONFIG,
  MAX_ATTACHMENTS,
  type AttachmentKindName,
} from '@/config/attachments';

/** Tanlangan narsa — kompozitor shu shaklda saqlaydi. */
export interface PickedAttachment {
  kind: AttachmentKindName;
  targetId: string;
  name: string;
  subtitle: string | null;
}

interface SearchResult {
  id: string;
  kind: AttachmentKindName;
  name: string;
  subtitle: string | null;
}

interface SearchResponse {
  results: SearchResult[];
}

export interface AttachmentPickerProps {
  selected: PickedAttachment[];
  onPick: (item: PickedAttachment) => void;
  onRemove: (kind: AttachmentKindName, targetId: string) => void;
  onCancel: () => void;
}

/** Qidiruv boshlanadigan eng kam belgi — serverdagi shart bilan bir xil. */
const MIN_SEARCH_LENGTH = 2;

/**
 * Videoga biriktiriladigan narsani tanlash oynasi.
 *
 * ── Nima uchun BITTA oyna, har bo'limga alohida emas ──────────────────
 * Beshta bo'lim uchun beshta oyna yasash mumkin edi. Lekin ularning
 * ishi bir xil: qidir, ro'yxatdan tanla, tanlanganini belgila.
 *
 * Farq faqat MATNDA va u `src/config/attachments.ts` dan olinadi.
 * Yangi bo'lim qo'shilganda bu fayl umuman o'zgarmaydi.
 *
 * ── Nima uchun TUR yuqorida tanlanadi ─────────────────────────────────
 * Hammasi bo'ylab bir vaqtda qidirish ham mumkin edi. Lekin natijada
 * "Plov" so'roviga taom ham, restoran ham, hatto mahsulot ham
 * qaytardi va odam qaysi biri kerakligini ajrata olmasdi.
 *
 * Tur oldin tanlansa, savol aniq bo'ladi: "qaysi taom?".
 */
export function AttachmentPicker({ selected, onPick, onRemove, onCancel }: AttachmentPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [kind, setKind] = useState<AttachmentKindName>('PRODUCT');
  const [term, setTerm] = useState('');

  const query = useDebouncedValue(term.trim(), 300);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  /**
   * So'rov faqat IKKI belgidan keyin yuboriladi.
   *
   * Bitta harf bo'yicha qidiruv butun katalogni qaytaradi va u
   * foydasiz — lekin bazani yuklaydi.
   */
  const { data, isLoading } = useApiQuery<SearchResponse>(
    query.length >= MIN_SEARCH_LENGTH
      ? `/api/v1/feed/attachments?kind=${kind}&q=${encodeURIComponent(query)}`
      : null,
  );

  const results = data?.results ?? [];
  const config = ATTACHMENT_KIND_CONFIG[kind];
  const isFull = selected.length >= MAX_ATTACHMENTS;

  return (
    <dialog
      ref={dialogRef}
      onCancel={dialogCancelHandler(onCancel)}
      className="glass animate-scale-in text-foreground m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl p-5 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">
          Biriktirish
          <span className="text-muted-foreground ml-1.5 text-xs font-normal tabular-nums">
            {`${selected.length}/${MAX_ATTACHMENTS}`}
          </span>
        </h2>

        <Button variant="ghost" size="icon" aria-label="Yopish" onClick={onCancel}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>

      {/* Tur tanlash — doiralar, kompozitordagi bo'limlar bilan bir xil. */}
      <div
        role="tablist"
        aria-label="Biriktirma turi"
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ATTACHMENT_KINDS.map((value) => {
          const item = ATTACHMENT_KIND_CONFIG[value];
          const Icon = item.icon;
          const isActive = kind === value;

          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setKind(value)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition-colors',
                isActive
                  ? 'border-primary bg-primary text-primary-foreground font-medium'
                  : 'border-border hover:bg-secondary',
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="relative mt-3">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder={config.placeholder}
          aria-label={`${config.label} qidirish`}
          className="pl-9"
          autoFocus
        />
      </div>

      {selected.length > 0 && (
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
          Tanlanganlar ro&apos;yxatda belgilangan. Ularni qayta bosib olib tashlash mumkin.
        </p>
      )}

      <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
        {query.length < MIN_SEARCH_LENGTH && (
          <p className="text-muted-foreground py-6 text-center text-sm">
            {`Videoda ko'rsatgan narsani qidiring: ${config.placeholder.toLowerCase()}.`}
          </p>
        )}

        {query.length >= MIN_SEARCH_LENGTH && isLoading && (
          <>
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-14 rounded-xl" />
            ))}
          </>
        )}

        {query.length >= MIN_SEARCH_LENGTH && !isLoading && results.length === 0 && (
          <p className="text-muted-foreground py-6 text-center text-sm">Hech narsa topilmadi.</p>
        )}

        {results.map((item) => {
          const isPicked = selected.some(
            (row) => row.kind === item.kind && row.targetId === item.id,
          );
          const Icon = ATTACHMENT_KIND_CONFIG[item.kind].icon;

          return (
            <button
              key={`${item.kind}:${item.id}`}
              type="button"
              disabled={!isPicked && isFull}
              onClick={() =>
                isPicked
                  ? onRemove(item.kind, item.id)
                  : onPick({
                      kind: item.kind,
                      targetId: item.id,
                      name: item.name,
                      subtitle: item.subtitle,
                    })
              }
              className={cn(
                'flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors',
                isPicked ? 'bg-primary/10' : 'hover:bg-secondary',
                !isPicked && isFull && 'cursor-not-allowed opacity-50',
              )}
            >
              <span className="bg-secondary text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-5" aria-hidden="true" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.name}</span>
                {item.subtitle && (
                  <span className="text-muted-foreground block truncate text-xs">{item.subtitle}</span>
                )}
              </span>

              {isPicked && <Check className="text-primary size-5 shrink-0" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      {/*
        "Tayyor" tugmasi KERAK: bir nechta tanlashda oyna o'zi
        yopilmasligi kerak, aks holda ikkinchi narsani qo'shish uchun
        uni qayta ochish kerak bo'lardi.
      */}
      <div className="mt-4 flex justify-end">
        <Button type="button" onClick={onCancel}>
          Tayyor
        </Button>
      </div>
    </dialog>
  );
}

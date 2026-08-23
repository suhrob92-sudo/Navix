'use client';

import { MessageSquareText, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { isSearchableQuery, SEARCH_MIN_LENGTH, splitHighlight } from '@/config/message-search';
import { useApiQuery } from '@/hooks/use-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatRelativeUz } from '@/lib/date';
import type { MessageSearchHit, MessageSearchResult } from '@/modules/chat/chat-search.types';

export interface MessageSearchPanelProps {
  /**
   * Berilsa — faqat SHU suhbat ichida qidiriladi.
   *
   * Berilmasa — barcha suhbatlar bo'ylab.
   */
  conversationId?: string;
  /** Natija bosilganda. */
  onSelect: (hit: MessageSearchHit) => void;
  onClose: () => void;
  placeholder?: string;
}

/**
 * Xabarlarni qidirish oynasi.
 *
 * ── Nima uchun BITTA komponent ikki joyda ─────────────────────────────
 * Qidiruv ikki joyda kerak: suhbat ichida ("bu suhbatda manzil
 * qayerda edi?") va umumiy ro'yxatda ("manzilni kim yuborgan edi?").
 *
 * Xatti-harakat ikkalasida ham bir xil: yozasan, kutasan, natijani
 * bosasan. Farqi bitta parametrda — qaysi suhbatda qidirilishi.
 * Ikkita komponent yozilsa, ertaga bittasida tuzatilgan xato
 * ikkinchisida qolib ketardi.
 */
export function MessageSearchPanel({
  conversationId,
  onSelect,
  onClose,
  placeholder,
}: MessageSearchPanelProps) {
  const [query, setQuery] = useState('');

  /**
   * So'rov KECHIKTIRILADI.
   *
   * Har bosilgan harfda so'rov yuborilsa, "manzil" so'zi oltita
   * so'rov qilardi — va ularning beshtasi keraksiz. Qidiruv esa
   * ilovadagi eng og'ir so'rovlardan biri.
   */
  const debounced = useDebouncedValue(query.trim(), 400);

  const url = useMemo(() => {
    if (!isSearchableQuery(debounced)) return null;

    const params = new URLSearchParams({ q: debounced });

    if (conversationId) params.set('conversationId', conversationId);

    return `/api/v1/chat/search?${params.toString()}`;
  }, [conversationId, debounced]);

  const { data, isLoading, error } = useApiQuery<MessageSearchResult>(url);

  const hits = data?.hits ?? [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="relative min-w-0 flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder ?? 'Xabarlar ichidan qidirish'}
            aria-label="Xabarlar ichidan qidirish"
            className="pl-10"
            autoFocus
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Qidiruvni yopish"
          className="hover:bg-secondary tap-target flex size-10 shrink-0 items-center justify-center rounded-full transition-colors"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {/*
          Qidiruv so'zi qisqa bo'lsa — YO'RIQNOMA, xato emas.

          Odam hali yozib bo'lmagan. Unga qizil xato ko'rsatish
          "siz noto'g'ri qildingiz" degan ma'noni berardi.
        */}
        {!url && (
          <p className="text-muted-foreground py-8 text-center text-sm leading-relaxed">
            Qidirish uchun kamida {SEARCH_MIN_LENGTH} ta belgi yozing.
          </p>
        )}

        {url && isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        )}

        {url && error && <p className="text-destructive py-6 text-center text-sm">{error}</p>}

        {url && !isLoading && !error && hits.length === 0 && (
          <EmptyState
            icon={MessageSquareText}
            title="Hech narsa topilmadi"
            description="Boshqa so'z bilan urinib ko'ring."
          />
        )}

        {hits.length > 0 && (
          <ul className="space-y-1" aria-label="Qidiruv natijalari">
            {hits.map((hit) => (
              <li key={hit.messageId}>
                <button
                  type="button"
                  onClick={() => onSelect(hit)}
                  className="hover:bg-secondary/60 flex w-full items-start gap-3 rounded-2xl p-2.5 text-left transition-colors"
                >
                  {/*
                    Umumiy qidiruvda SUHBAT rasmi, suhbat ichida esa
                    YUBORUVCHI rasmi ko'rsatiladi.

                    Sabab: umumiy ro'yxatda "qayerda topildi" muhim,
                    suhbat ichida esa u allaqachon ma'lum — u yerda
                    "kim yozgan" muhim.
                  */}
                  <Avatar
                    src={conversationId ? hit.senderAvatarUrl : hit.conversationImageUrl}
                    name={conversationId ? hit.senderName : hit.conversationTitle}
                    size="md"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {conversationId ? hit.senderName : hit.conversationTitle}
                      </p>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {formatRelativeUz(hit.createdAt)}
                      </span>
                    </div>

                    <Highlighted text={hit.snippet} query={data?.query ?? ''} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * Topilgan so'zni ajratib ko'rsatadi.
 *
 * ── Nima uchun HTML ISHLATILMAYDI ─────────────────────────────────────
 * Matnni `<mark>` bilan o'rab, HTML sifatida chizish oson edi. Lekin
 * unda xabar matni HTML bo'lib talqin qilinardi — ya'ni odam yozgan
 * kod boshqa odamning brauzerida ishga tushishi mumkin edi.
 *
 * Bo'laklar esa oddiy matn bo'lib qoladi va React ularni xavfsiz
 * chizadi.
 */
function Highlighted({ text, query }: { text: string; query: string }) {
  const [before, match, after] = splitHighlight(text, query);

  return (
    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm leading-relaxed break-words">
      {before}
      {match && <span className="text-foreground bg-primary/15 rounded px-0.5 font-medium">{match}</span>}
      {after}
    </p>
  );
}

'use client';

import { BadgeCheck, Check, Search, UserSearch, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';
import type { UserSearchResponse, UserSearchResult } from '@/modules/profile/social.types';

export interface UserPickerProps {
  /** Tanlangan odamlar — tashqarida saqlanadi. */
  selected: UserSearchResult[];
  onChange: (next: UserSearchResult[]) => void;
  /** Ro'yxatda ko'rsatilmaydigan ID'lar (masalan allaqachon guruhda bo'lganlar). */
  excludeIds?: readonly string[];
  /** Eng ko'pi bilan nechta odam tanlash mumkin. */
  max: number;
  /** Qidiruv maydonining izohi. */
  placeholder?: string;
}

/**
 * Odam tanlash maydoni — guruh yaratish va a'zo qo'shish uchun.
 *
 * ── Nima uchun ALOHIDA komponent ──────────────────────────────────────
 * U ikki joyda kerak: guruh yaratishda va keyin a'zo qo'shishda.
 * Ikkalasida ham xatti-harakat bir xil bo'lishi kerak — qidiruv,
 * chegara, tanlanganlar qatori. Nusxalansa, ertaga bittasida chegara
 * tuzatilib, ikkinchisida unutilardi.
 *
 * ── Nima uchun qidiruv KECHIKTIRILADI ─────────────────────────────────
 * Har bosilgan harf uchun so'rov yuborilsa, "Abdulla" so'zi yettita
 * so'rov qilardi va oxirgisidan boshqasi keraksiz bo'lardi.
 */
export function UserPicker({ selected, onChange, excludeIds = [], max, placeholder }: UserPickerProps) {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 350);

  /**
   * Qidiruv so'rovi FAQAT ikki harfdan boshlab yuboriladi.
   *
   * Bitta harf bo'yicha qidiruv deyarli butun bazani qaytaradi va
   * foydali natija bermaydi.
   */
  const url = debounced.length >= 2 ? `/api/v1/users/search?q=${encodeURIComponent(debounced)}` : null;

  const { data, isLoading, error } = useApiQuery<UserSearchResponse>(url);

  const selectedIds = useMemo(() => new Set(selected.map((user) => user.id)), [selected]);
  const hiddenIds = useMemo(() => new Set(excludeIds), [excludeIds]);

  const results = (data?.users ?? []).filter((user) => !hiddenIds.has(user.id));

  const isFull = selected.length >= max;

  function toggle(user: UserSearchResult) {
    if (selectedIds.has(user.id)) {
      onChange(selected.filter((item) => item.id !== user.id));
      return;
    }

    // Chegaraga yetganda yangi odam qo'shilmaydi — tugma o'chirilgan bo'ladi.
    if (isFull) return;

    onChange([...selected, user]);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder ?? "Ism yoki @nom bo'yicha qidiring"}
          aria-label="Odam qidirish"
          className="pl-10"
        />
      </div>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Tanlanganlar">
          {selected.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => toggle(user)}
                className="bg-secondary hover:bg-secondary/70 tap-target-y flex items-center gap-2 rounded-full py-1.5 pr-2 pl-1.5 text-sm transition-colors"
                aria-label={`${user.fullName ?? user.username} — tanlovdan olib tashlash`}
              >
                <Avatar src={user.avatarUrl} name={user.fullName ?? user.username} size="sm" />
                <span className="max-w-32 truncate">{user.fullName ?? `@${user.username}`}</span>
                <X className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {isFull && (
        <p className="text-muted-foreground text-xs">Chegaraga yetdingiz: eng ko&apos;pi {max} ta odam.</p>
      )}

      {isLoading && url && (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-14 rounded-2xl" />
          ))}
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      {!isLoading && url && !error && results.length === 0 && (
        <EmptyState
          icon={UserSearch}
          title="Hech kim topilmadi"
          description="Boshqa ism yoki @nom bilan qidiring."
        />
      )}

      {results.length > 0 && (
        <ul className="space-y-1" aria-label="Qidiruv natijalari">
          {results.map((user) => {
            const isSelected = selectedIds.has(user.id);

            return (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => toggle(user)}
                  /**
                   * Chegaraga yetganda faqat TANLANMAGANLAR o'chiriladi:
                   * tanlanganini olib tashlash har doim mumkin bo'lishi
                   * kerak, aks holda odam qamalib qolardi.
                   */
                  disabled={isFull && !isSelected}
                  className={cn(
                    'hover:bg-secondary/60 flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors',
                    'disabled:cursor-not-allowed disabled:opacity-40',
                    isSelected && 'bg-secondary/70',
                  )}
                  aria-pressed={isSelected}
                >
                  <Avatar src={user.avatarUrl} name={user.fullName ?? user.username} size="md" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-medium">{user.fullName ?? `@${user.username}`}</p>
                      {user.isVerified && (
                        <BadgeCheck className="text-primary size-4 shrink-0" aria-label="Tasdiqlangan" />
                      )}
                    </div>
                    <p className="text-muted-foreground truncate text-sm">@{user.username}</p>
                  </div>

                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                      isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-border',
                    )}
                    aria-hidden="true"
                  >
                    {isSelected && <Check className="size-4" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

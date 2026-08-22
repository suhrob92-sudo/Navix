'use client';

import { BadgeCheck, MessageCircle, Search, Store, Users, UsersRound } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { ServiceIcon } from '@/components/app/service-icon';
import { FilterChip } from '@/components/ui/filter-chip';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiQuery } from '@/hooks/use-api';
import { formatRelativeUz } from '@/lib/date';
import { cn } from '@/lib/utils';
import {
  CHAT_FILTERS,
  formatLastMessage,
  formatUnread,
  type ChatFilter,
  type ConversationsResponse,
} from '@/modules/chat/chat.types';

/**
 * Xabarlar ro'yxati.
 *
 * ── Nima uchun qidiruv XOTIRADA emas, so'rovda ────────────────────────
 * Qidiruv matni manzilga qo'shiladi va server filtrlaydi. Shunda
 * sahifalash bilan ziddiyat bo'lmaydi: ikkinchi sahifadagi suhbat ham
 * topiladi.
 *
 * ── Nima uchun "online" belgisi hozircha yo'q ─────────────────────────
 * Uni ko'rsatish uchun kim hozir ilovada ekanini bilish kerak, bu esa
 * jonli ulanish (SSE) talab qiladi. U chat oynasi bilan birga
 * qo'shiladi — ishlamaydigan yashil nuqta chizishdan ko'ra uni umuman
 * ko'rsatmagan ma'qul.
 */
export function MessagesContent() {
  const [filter, setFilter] = useState<ChatFilter>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const url = useMemo(() => {
    const params = new URLSearchParams({ filter, pageSize: '50' });

    if (search) params.set('search', search);

    return `/api/v1/chat/conversations?${params.toString()}`;
  }, [filter, search]);

  const { data, isLoading, error } = useApiQuery<ConversationsResponse>(url);

  const conversations = data?.conversations ?? [];

  return (
    <>
      <AppHeader title="Xabarlar" />

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchInput.trim());
            }}
            className="relative min-w-0 flex-1"
          >
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Xabar yoki foydalanuvchi qidirish"
              aria-label="Xabar yoki foydalanuvchi qidirish"
              className="pl-10"
            />
          </form>

          {/*
            "Yangi guruh" tugmasi qidiruv YONIDA.

            Yuqori panelga qo'yish mumkin edi, lekin u umumiy komponent:
            u yerga qo'shilgan tugma barcha sahifalarda paydo bo'lardi.
          */}
          <Button asChild variant="outline" size="icon" className="shrink-0">
            <Link href="/messages/new-group" aria-label="Yangi guruh yaratish">
              <Users className="size-5" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="-mx-4 mt-3 mb-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1">
          {CHAT_FILTERS.map((item) => (
            <FilterChip
              key={item.value}
              label={item.label}
              active={filter === item.value}
              onClick={() => setFilter(item.value)}
            />
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-18 rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && error && (
          <Alert variant="error" title="Suhbatlarni yuklab bo'lmadi">
            {error}
          </Alert>
        )}

        {!isLoading && !error && conversations.length === 0 && (
          <EmptyState
            icon={MessageCircle}
            title={search || filter !== 'ALL' ? 'Suhbat topilmadi' : "Hali suhbat yo'q"}
            description={
              search || filter !== 'ALL'
                ? "Boshqa so'z yoki filtr tanlang."
                : 'Profil yoki kompaniya sahifasidagi "Xabar" tugmasi orqali suhbat boshlang.'
            }
            action={
              <Button asChild variant="outline">
                <Link href="/dashboard">Xizmatlarni ochish</Link>
              </Button>
            }
          />
        )}

        <ul className="space-y-1" aria-label="Suhbatlar">
          {conversations.map((item, index) => (
            <li key={item.id}>
              <Link
                href={`/messages/${item.id}`}
                className="hover:bg-secondary/60 animate-fade-up flex items-center gap-3 rounded-2xl p-3 transition-colors"
                style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
              >
                {item.peer.kind === 'BUSINESS' && item.peer.color ? (
                  <ServiceIcon icon={Store} color={item.peer.color} size="md" />
                ) : (
                  <div className="relative shrink-0">
                    <Avatar src={item.peer.avatarUrl} name={item.peer.name} size="md" />

                    {/*
                      Guruh belgisi avatar ustida.

                      Usiz ro'yxatda guruh odamdan farq qilmasdi: ikkalasi
                      ham dumaloq rasm va ism bo'lib ko'rinardi.
                    */}
                    {item.peer.kind === 'GROUP' && (
                      <span
                        className="bg-secondary text-secondary-foreground ring-background absolute -right-0.5 -bottom-0.5 flex size-4.5 items-center justify-center rounded-full ring-2"
                        aria-label="Guruh"
                      >
                        <UsersRound className="size-2.5" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-medium">{item.peer.name}</p>
                    {item.peer.isVerified && (
                      <BadgeCheck className="text-primary size-4 shrink-0" aria-label="Tasdiqlangan" />
                    )}
                  </div>

                  <p
                    className={cn(
                      'mt-0.5 truncate text-sm',
                      item.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground',
                    )}
                  >
                    {formatLastMessage(item)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-muted-foreground text-xs">{formatRelativeUz(item.lastMessageAt)}</span>

                  {item.unreadCount > 0 && (
                    <span
                      className="bg-primary text-primary-foreground inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums"
                      aria-label={`${item.unreadCount} ta o'qilmagan xabar`}
                    >
                      {formatUnread(item.unreadCount)}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>

        {conversations.length > 0 && (
          <p className="text-muted-foreground mt-4 px-1 pb-2 text-center text-xs leading-relaxed">
            Media yuborish va qo&apos;ng&apos;iroq keyingi bosqichlarda qo&apos;shiladi.
          </p>
        )}
      </div>
    </>
  );
}

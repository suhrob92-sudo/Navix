'use client';

import { ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

/**
 * Buyurtmalar sahifasi.
 *
 * Hozircha buyurtma yaratadigan modul yo'q (taksi, ovqat va boshqalar
 * keyingi bosqichlarda yoziladi), shuning uchun ro'yxat bo'sh. Filtrlar
 * va tuzilma esa tayyor — modul qo'shilganda faqat ma'lumot manbai ulanadi.
 */

const FILTERS = [
  { id: 'all', label: 'Barchasi' },
  { id: 'active', label: 'Faol' },
  { id: 'completed', label: 'Tugallangan' },
  { id: 'cancelled', label: 'Bekor qilingan' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

export function OrdersContent() {
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');

  return (
    <>
      <AppHeader title="Buyurtmalar" />

      <div className="space-y-5 px-4 pt-4">
        {/* Filtrlar */}
        <div className="scrollbar-slim -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              aria-pressed={activeFilter === filter.id}
              className={cn(
                'shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                activeFilter === filter.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border-border text-muted-foreground hover:text-foreground border',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="bg-card border-border rounded-2xl border">
          <EmptyState
            icon={ClipboardList}
            title="Buyurtmalar yo'q"
            description="Taksi, ovqat va boshqa xizmatlardan buyurtma berganingizda ular shu yerda ko'rinadi."
            action={
              <Button asChild>
                <Link href="/dashboard">Xizmatlarni ko&apos;rish</Link>
              </Button>
            }
          />
        </div>
      </div>
    </>
  );
}

'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { StoryComposer } from '@/components/story/story-composer';
import { StoryViewer } from '@/components/story/story-viewer';
import { Avatar } from '@/components/ui/avatar';
import { useApiQuery } from '@/hooks/use-api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/modules/auth/auth-context';
import { authorDisplayName } from '@/modules/feed/feed.types';
import type { StoryGroupView, StoryTrayResponse } from '@/modules/story/story.types';

/**
 * Lenta tepasidagi hikoyalar halqasi.
 *
 * ── Nima uchun DOIRA, kvadrat emas ────────────────────────────────────
 * Doira — odam yuzi. Kvadrat — kontent. Halqada odamlar turadi, ya'ni
 * "kimda yangilik bor" degan savolga javob beriladi; kontentning o'zi
 * esa ochilganda ko'rinadi.
 *
 * ── Nima uchun rangli chekka ──────────────────────────────────────────
 * Ko'rilmagan hikoya rangli, ko'rilgani kulrang. Bu belgi hech qanday
 * matnsiz "bu yerda yangilik bor" deb aytadi va odam halqani bir
 * qarashda o'qiydi.
 */
export function StoryTray() {
  const { user } = useAuth();
  const { data, reload } = useApiQuery<StoryTrayResponse>('/api/v1/stories');

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const groups = data?.groups ?? [];

  /** Mening o'z guruhim — halqada birinchi turadi. */
  const mine = groups.find((group) => group.author.userId === user?.id) ?? null;
  const others = groups.filter((group) => group.author.userId !== user?.id);

  /**
   * Ko'ruvchiga beriladigan ro'yxat — halqadagi TARTIBDA.
   *
   * Odam bitta hikoyani ko'rib bo'lgach keyingi ODAMGA o'tadi: bu
   * ketma-ketlik halqadagi tartib bilan bir xil bo'lishi kerak, aks
   * holda u qayerga tushib qolganini tushunmasdi.
   */
  const ordered: StoryGroupView[] = mine ? [mine, ...others] : others;

  return (
    <section aria-label="Hikoyalar">
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/*
          Hikoya qo'shish tugmasi DOIM birinchi.

          O'z hikoyam bo'lsa ham: yangi hikoya qo'shish eng ko'p
          takrorlanadigan amal va u qidirilmasligi kerak.

          Yozuvi "Joylash" EMAS: lentada post joylash tugmasi ham bor
          va ikkita bir xil so'z odamni chalkashtirardi.
        */}
        <button
          type="button"
          aria-label="Hikoya joylash"
          onClick={() => setIsComposerOpen(true)}
          className="flex w-20 shrink-0 flex-col items-center gap-1.5"
        >
          {/* Ichki bo'shliqlar avatar halqasi bilan bir xil — qator tekis turadi. */}
          <span className="rounded-full p-[2.5px]">
            <span className="block rounded-full p-[2px]">
              <span className="border-border bg-secondary text-muted-foreground flex size-16 items-center justify-center rounded-full border-2 border-dashed">
                <Plus className="size-6" aria-hidden="true" />
              </span>
            </span>
          </span>
          <span className="text-muted-foreground w-full truncate text-center text-xs">Hikoya</span>
        </button>

        {ordered.map((group, index) => (
          <button
            key={group.author.userId}
            type="button"
            onClick={() => setOpenIndex(index)}
            className="flex w-20 shrink-0 flex-col items-center gap-1.5"
          >
            {/*
              Chekka RANGI — halqaning butun ma'nosi.

              Ko'rilmagan: rangli gradient. Ko'rilgan: kulrang.
            */}
            <span
              className={cn(
                'rounded-full p-[2.5px]',
                group.isAllSeen
                  ? 'bg-border'
                  : 'bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600',
              )}
            >
              <span className="bg-background block rounded-full p-[2px]">
                <Avatar src={group.author.avatarUrl} name={group.author.fullName} size="lg" />
              </span>
            </span>

            <span className="w-full truncate text-center text-xs">
              {group.author.userId === user?.id ? 'Siz' : authorDisplayName(group.author)}
            </span>
          </button>
        ))}
      </div>

      {isComposerOpen && (
        <StoryComposer
          onClose={() => setIsComposerOpen(false)}
          onPosted={() => {
            setIsComposerOpen(false);
            reload();
          }}
        />
      )}

      {openIndex !== null && ordered[openIndex] && (
        <StoryViewer
          groups={ordered}
          startIndex={openIndex}
          onClose={() => {
            setOpenIndex(null);
            // Ko'rilgan belgisi yangilanishi uchun halqa qayta o'qiladi.
            reload();
          }}
        />
      )}
    </section>
  );
}

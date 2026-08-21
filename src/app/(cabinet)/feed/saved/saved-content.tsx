'use client';

import { Bookmark, FolderPlus, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { CollectionPicker } from '@/components/feed/collection-picker';
import { PostList } from '@/components/feed/post-list';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  COLLECTION_ALL_LABEL,
  COLLECTION_FILTER_ALL,
  COLLECTION_FILTER_NONE,
  COLLECTION_NAME_MAX_LENGTH,
  COLLECTION_NONE_LABEL,
  MAX_COLLECTIONS,
  cleanCollectionName,
} from '@/config/collections';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { useCursorList } from '@/hooks/use-cursor-list';
import { usePostActions } from '@/hooks/use-post-actions';
import { toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { RequireAuth } from '@/modules/auth/require-auth';
import type { CollectionView } from '@/modules/feed/collection.service';
import type { PostView } from '@/modules/feed/feed.types';

/**
 * Saqlangan postlar.
 *
 * ── Nima uchun bu sahifa MUHIM ───────────────────────────────────────
 * Odam videoda mahsulotni ko'rdi, lekin hozir pul yo'q yoki vaqti
 * yo'q. Saqlanmasa — u postni boshqa hech qachon topa olmaydi:
 * lenta oqadi va o'sha video pastda ko'milib qoladi.
 *
 * Saqlash esa uni "keyin sotib olaman" ro'yxatiga qo'yadi va bu —
 * to'g'ridan-to'g'ri sotuvga olib boradigan yo'l.
 *
 * ── Nima uchun TO'PLAMLAR qo'shildi ──────────────────────────────────
 * Ro'yxat bitta va uzun edi. Ikki yuzta post saqlagan odam kerakli
 * retseptni topa olmasdi — ya'ni saqlash o'z ma'nosini yo'qotardi:
 * "keyin topaman" deb saqlangan narsani topib bo'lmasa, saqlashning
 * foydasi yo'q.
 */
export function SavedContent() {
  return (
    <RequireAuth>
      <SavedBody />
    </RequireAuth>
  );
}

function SavedBody() {
  const request = useApiClient();

  /** Qaysi to'plam ochiq: `ALL`, `NONE` yoki to'plam ID si. */
  const [filter, setFilter] = useState<string>(COLLECTION_FILTER_ALL);

  const collections = useApiQuery<{ collections: CollectionView[] }>('/api/v1/feed/collections');
  const list = useCursorList<PostView>(`/api/v1/feed/saved?collection=${filter}`, 'posts');
  const actions = usePostActions(list.setItems);

  /** "To'plamga solish" oynasi qaysi post uchun ochilgan. */
  const [picking, setPicking] = useState<PostView | null>(null);

  /** To'plamni boshqarish holati. */
  const [renaming, setRenaming] = useState<CollectionView | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [deleting, setDeleting] = useState<CollectionView | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [manageError, setManageError] = useState<string | null>(null);

  const items = collections.data?.collections ?? [];
  const isEmpty = !list.isLoading && !list.error && list.items.length === 0;

  /** Hozir ochiq to'plam — sarlavha va bo'sh holat matni uchun. */
  const active = items.find((item) => item.id === filter) ?? null;

  async function submitRename() {
    if (!renaming) return;

    const name = cleanCollectionName(renameDraft);

    if (name.length === 0 || name === renaming.name) {
      setRenaming(null);

      return;
    }

    setIsBusy(true);
    setManageError(null);

    try {
      await request(`/api/v1/feed/collections/${renaming.id}`, { method: 'PATCH', body: { name } });

      setRenaming(null);
      collections.reload();
    } catch (error) {
      setManageError(toUserMessage(error));
    } finally {
      setIsBusy(false);
    }
  }

  async function submitDelete() {
    if (!deleting) return;

    setIsBusy(true);
    setManageError(null);

    try {
      await request(`/api/v1/feed/collections/${deleting.id}`, { method: 'DELETE' });

      /*
        Ochiq to'plam o'chirilsa — "Barchasi" ga qaytamiz.

        Aks holda ekranda mavjud bo'lmagan to'plamning bo'sh
        ro'yxati turardi va odam nima bo'lganini tushunmasdi.
      */
      if (filter === deleting.id) setFilter(COLLECTION_FILTER_ALL);

      setDeleting(null);
      collections.reload();
      list.reload();
    } catch (error) {
      setManageError(toUserMessage(error));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <>
      <AppHeader title="Saqlanganlar" showBack backHref="/feed" />

      <div className="space-y-4 px-4 pt-4">
        {/*
          To'plamlar qatori — sahifaning TEPASIDA.

          ── Nima uchun gorizontal ro'yxat ──────────────────────────
          Telefonda o'nta to'plam vertikal ro'yxat bo'lsa, postlar
          ekrandan butunlay chiqib ketardi. Gorizontal qator esa
          bitta qator joy oladi va barmoq bilan suriladi.
        */}
        {items.length > 0 && (
          <div
            role="tablist"
            aria-label="To'plamlar"
            className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden"
          >
            <FilterChip
              label={COLLECTION_ALL_LABEL}
              isActive={filter === COLLECTION_FILTER_ALL}
              onClick={() => setFilter(COLLECTION_FILTER_ALL)}
            />

            {items.map((item) => (
              <FilterChip
                key={item.id}
                label={item.name}
                count={item.count}
                isActive={filter === item.id}
                onClick={() => setFilter(item.id)}
              />
            ))}

            {/*
              "Guruhlanmagan" — qatorning OXIRIDA.

              U doim bor, lekin ko'p odam uni deyarli ochmaydi:
              odatiy holat "hammasi" yoki aniq bir papka. Boshiga
              qo'yilsa, u papkalarni ekrandan surib yuborardi.
            */}
            <FilterChip
              label={COLLECTION_NONE_LABEL}
              isActive={filter === COLLECTION_FILTER_NONE}
              onClick={() => setFilter(COLLECTION_FILTER_NONE)}
            />
          </div>
        )}

        {/* Ochiq to'plamni boshqarish — faqat haqiqiy to'plamda. */}
        {active && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRenaming(active);
                setRenameDraft(active.name);
                setManageError(null);
              }}
            >
              <Pencil className="size-4" aria-hidden="true" />
              Nomini o&apos;zgartirish
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDeleting(active);
                setManageError(null);
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              O&apos;chirish
            </Button>
          </div>
        )}

        {manageError && <Alert variant="error">{manageError}</Alert>}
        {actions.error && <Alert variant="error">{actions.error}</Alert>}

        {list.error && (
          <Alert variant="error" title="Ro'yxatni yuklab bo'lmadi">
            {list.error}
          </Alert>
        )}

        {list.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-40 rounded-2xl" />
            ))}
          </div>
        )}

        {isEmpty && (
          <EmptyState
            icon={active ? FolderPlus : Bookmark}
            title={active ? `"${active.name}" bo'sh` : 'Hali hech narsa saqlamagansiz'}
            description={
              active
                ? 'Saqlangan postdagi uch nuqtani bosing va "To\'plamga solish" ni tanlang.'
                : "Postdagi xatcho'p belgisini bosing — u shu yerda turadi va uni faqat siz ko'rasiz."
            }
            action={
              <Button asChild variant="outline">
                <Link href="/feed">Lentaga o&apos;tish</Link>
              </Button>
            }
          />
        )}

        <PostList
          posts={list.items}
          actions={actions}
          onChooseCollection={(post) => {
            setPicking(post);
            setManageError(null);
          }}
        />

        {list.hasMore && (
          <Button
            variant="outline"
            fullWidth
            isLoading={list.isLoadingMore}
            loadingText="Yuklanmoqda..."
            onClick={list.loadMore}
          >
            Yana ko&apos;rsatish
          </Button>
        )}

        {/*
          Yo'riqnoma — FAQAT to'plam yo'q bo'lganda.

          To'plamlar paydo bo'lgach u keraksiz: odam allaqachon
          qanday ishlashini biladi va yozuv joyni bekorga egallardi.
        */}
        {items.length === 0 && list.items.length > 0 && (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {`Saqlanganlarni papkalarga ajratish mumkin: postdagi uch nuqtani bosing va "To'plamga solish" ni tanlang. ${MAX_COLLECTIONS} tagacha to'plam yasash mumkin.`}
          </p>
        )}
      </div>

      {picking && (
        <CollectionPicker
          postId={picking.id}
          currentId={picking.collectionId ?? null}
          collections={items}
          onClose={() => setPicking(null)}
          onSaved={(collectionId) => {
            const movedId = picking.id;

            setPicking(null);

            /*
              Ro'yxat DARHOL yangilanadi.

              Serverdan qayta so'rash ham mumkin edi, lekin unda
              odam bir zumga eski holatni ko'rardi. Bu yerda esa
              natija bir lahzada ko'rinadi.
            */
            list.setItems((current) =>
              current.map((item) => (item.id === movedId ? { ...item, collectionId } : item)),
            );

            /*
              Ochiq to'plamdan CHIQARILGAN post ro'yxatdan olinadi.

              Aks holda "Retseptlar" papkasida boshqa papkaga
              ko'chirilgan post turib qolardi.
            */
            if (filter !== COLLECTION_FILTER_ALL) {
              const stays = filter === COLLECTION_FILTER_NONE ? collectionId === null : collectionId === filter;

              if (!stays) {
                list.setItems((current) => current.filter((item) => item.id !== movedId));
              }
            }

            // Sonlar o'zgardi — qatordagi raqamlar yangilanishi kerak.
            collections.reload();
          }}
        />
      )}

      {/* Nomni o'zgartirish oynasi. */}
      {renaming && (
        <dialog
          open
          className="glass animate-scale-in text-foreground fixed inset-0 z-50 m-auto h-fit w-[calc(100%-2rem)] max-w-sm rounded-2xl p-5"
        >
          <h2 className="mb-3 text-base font-semibold">To&apos;plam nomi</h2>

          <Input
            aria-label="To'plam nomi"
            value={renameDraft}
            maxLength={COLLECTION_NAME_MAX_LENGTH}
            disabled={isBusy}
            onChange={(event) => setRenameDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void submitRename();
              }
            }}
          />

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" disabled={isBusy} onClick={() => setRenaming(null)}>
              Bekor qilish
            </Button>

            <Button size="sm" isLoading={isBusy} loadingText="Saqlanmoqda..." onClick={() => void submitRename()}>
              Saqlash
            </Button>
          </div>
        </dialog>
      )}

      {/*
        O'chirishda POSTLAR qolishini ATAYIN aytamiz.

        Odam papkani o'chirishdan qo'rqadi: "ichidagi ellikta post
        ham ketadimi?" Javob yozilmasa, u umuman o'chirmasdi va
        keraksiz papkalar yig'ilib qolardi.
      */}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={deleting ? `"${deleting.name}" o'chirilsinmi?` : ''}
        description="Faqat to'plam o'chadi. Ichidagi postlar saqlanganlarda qoladi va 'Guruhlanmagan' bo'limiga o'tadi."
        confirmLabel="O'chirish"
        isDestructive
        isLoading={isBusy}
        onConfirm={() => void submitDelete()}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

/** To'plamlar qatoridagi bitta tugma. */
function FilterChip({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count?: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3.5 py-2 text-sm whitespace-nowrap transition-colors',
        isActive
          ? 'border-primary bg-primary text-primary-foreground font-medium'
          : 'border-border hover:bg-secondary',
      )}
    >
      {typeof count === 'number' ? `${label} · ${count}` : label}
    </button>
  );
}

'use client';

import { Check, FolderPlus, Inbox, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COLLECTION_NAME_MAX_LENGTH, MAX_COLLECTIONS, cleanCollectionName } from '@/config/collections';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { CollectionView } from '@/modules/feed/collection.service';

export interface CollectionPickerProps {
  /** Qaysi post solinyapti. */
  postId: string;
  /** Post hozir qaysi to'plamda — `null` bo'lsa guruhlanmagan. */
  currentId: string | null;
  /** Ro'yxat — sahifada allaqachon yuklangan. */
  collections: CollectionView[];
  /** Tanlov saqlandi. Yangi to'plam yasalgan bo'lsa u ham keladi. */
  onSaved: (collectionId: string | null, created: CollectionView | null) => void;
  onClose: () => void;
}

/**
 * "To'plamga solish" oynasi.
 *
 * ── Nima uchun ALOHIDA oyna, ochiladigan ro'yxat emas ─────────────────
 * Oddiy ochiladigan ro'yxat (`select`) telefonda tizim oynasini
 * ochadi va unga "yangi to'plam yasash" bandini qo'shib bo'lmaydi.
 *
 * Odam esa ko'pincha AYNAN shu paytda yangi papka yasamoqchi bo'ladi:
 * u postni saqlayotganda "buni retseptlarga solaman" deb o'ylaydi va
 * o'sha papka hali yo'q. Uni sozlamalarga yuborish — fikrni uzish.
 *
 * ── Nima uchun ro'yxat TASHQARIDAN keladi ─────────────────────────────
 * Sahifa to'plamlarni allaqachon yuklagan (tepadagi filtr uchun).
 * Oyna ularni qaytadan so'rasa, har ochilishda ortiqcha so'rov
 * ketardi va oyna bo'sh holda ochilib, keyin to'lardi.
 */
export function CollectionPicker({
  postId,
  currentId,
  collections,
  onSaved,
  onClose,
}: CollectionPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const request = useApiClient();

  const [selected, setSelected] = useState<string | null>(currentId);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const isFull = collections.length >= MAX_COLLECTIONS;

  /**
   * Takroriy nomni OLDINDAN aytadi.
   *
   * Server ham buni rad etadi, lekin xato yozuvni yuborgandan
   * KEYIN chiqardi. Tugmani oldindan o'chirib qo'yish tezroq va
   * tushunarliroq.
   */
  const cleanName = cleanCollectionName(newName);
  const isDuplicate =
    cleanName.length > 0 &&
    collections.some((item) => item.name.toLowerCase() === cleanName.toLowerCase());

  async function createAndSelect() {
    if (cleanName.length === 0 || isDuplicate || isCreating) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await request<{ collection: CollectionView }>('/api/v1/feed/collections', {
        method: 'POST',
        body: { name: cleanName },
      });

      /*
        Yangi to'plam DARHOL tanlanadi.

        Odam uni aynan shu post uchun yasadi. Yasalgach ro'yxatda
        tanlanmay tursa, u yana bir marta bosishga majbur bo'lardi.
      */
      setSelected(response.collection.id);
      setNewName('');

      await save(response.collection.id, response.collection);
    } catch (caught) {
      setError(toUserMessage(caught));
      setIsCreating(false);
    }
  }

  async function save(collectionId: string | null, created: CollectionView | null) {
    setIsSaving(true);
    setError(null);

    try {
      await request(`/api/v1/feed/saved/${postId}/collection`, {
        method: 'PUT',
        body: { collectionId },
      });

      onSaved(collectionId, created);
    } catch (caught) {
      setError(toUserMessage(caught));
      setIsSaving(false);
      setIsCreating(false);
    }
  }

  const isBusy = isSaving || isCreating;

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        if (!isBusy) onClose();
      }}
      className="glass animate-scale-in text-foreground m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl p-5 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">To&apos;plamga solish</h2>

        <Button variant="ghost" size="icon" aria-label="Yopish" disabled={isBusy} onClick={onClose}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>

      <ul role="radiogroup" aria-label="To'plamlar" className="max-h-64 space-y-1 overflow-y-auto">
        {/*
          "Guruhlanmagan" — ro'yxatning BIRINCHI bandi.

          Bu postni to'plamdan CHIQARISH yo'li. Alohida "chiqarish"
          tugmasi yasalsa, odam uni "saqlanganlardan o'chirish" deb
          tushunib, bosishdan qo'rqardi.
        */}
        <li>
          <button
            type="button"
            role="radio"
            aria-checked={selected === null}
            disabled={isBusy}
            onClick={() => void save(null, null)}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-60',
              selected === null ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary',
            )}
          >
            <span className="bg-secondary text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
              <Inbox className="size-4" aria-hidden="true" />
            </span>

            <span className="min-w-0 flex-1 text-sm font-medium">Guruhlanmagan</span>

            {selected === null && <Check className="text-primary size-4 shrink-0" aria-hidden="true" />}
          </button>
        </li>

        {collections.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              role="radio"
              aria-checked={selected === item.id}
              disabled={isBusy}
              onClick={() => void save(item.id, null)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-60',
                selected === item.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary',
              )}
            >
              <span className="bg-secondary text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums">
                {item.count}
              </span>

              <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>

              {selected === item.id && (
                <Check className="text-primary size-4 shrink-0" aria-hidden="true" />
              )}
            </button>
          </li>
        ))}
      </ul>

      {/* Yangi to'plam — ro'yxatning ostida. */}
      <div className="border-border mt-4 border-t pt-4">
        {isFull ? (
          <p className="text-muted-foreground text-xs leading-relaxed">
            {`To'plamlar soni chegaraga yetdi (${MAX_COLLECTIONS} ta). Yangisini yasash uchun keraksizini o'chiring.`}
          </p>
        ) : (
          <>
            <label htmlFor="new-collection" className="mb-1.5 block text-xs font-medium">
              Yangi to&apos;plam
            </label>

            <div className="flex items-center gap-2">
              <Input
                id="new-collection"
                value={newName}
                maxLength={COLLECTION_NAME_MAX_LENGTH}
                disabled={isBusy}
                placeholder="Masalan: Retseptlar"
                onChange={(event) => setNewName(event.target.value)}
                /*
                  Enter bosilganda ham yasaladi.

                  Telefon klaviaturasida "tayyor" tugmasi aynan
                  shuni yuboradi va odam tugmani qidirmaydi.
                */
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void createAndSelect();
                  }
                }}
              />

              <Button
                type="button"
                size="sm"
                disabled={isBusy || cleanName.length === 0 || isDuplicate}
                onClick={() => void createAndSelect()}
              >
                {isCreating ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <FolderPlus className="size-4" aria-hidden="true" />
                )}
                Yasash
              </Button>
            </div>

            {isDuplicate && (
              <p className="text-muted-foreground mt-1.5 text-xs">
                {`"${cleanName}" nomli to'plam allaqachon bor.`}
              </p>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="text-destructive mt-3 text-xs leading-relaxed" role="alert">
          {error}
        </p>
      )}
    </dialog>
  );
}

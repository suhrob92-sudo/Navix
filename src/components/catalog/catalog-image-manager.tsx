/* eslint-disable @next/next/no-img-element */
'use client';

import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2 } from 'lucide-react';
import { useCallback, useId, useRef, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { MAX_CATALOG_IMAGES, catalogImagesPath, type CatalogImageOwner } from '@/config/catalog-image';
import { useApiClient } from '@/hooks/use-api';
import { useFileUpload } from '@/hooks/use-file-upload';
import { toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { CatalogImagesResponse, CatalogImageView } from '@/modules/catalog/catalog-image.types';

/**
 * Kabinetdagi rasmlar boshqaruvi: qo'shish, o'chirish, tartiblash.
 *
 * ── Nima uchun SUDRAB tashlash emas ───────────────────────────────────
 * Sudrab tashlash (drag and drop) kompyuterda chiroyli, telefonda esa
 * deyarli ishlamaydi: barmoq bosilganda sahifaning o'zi suriladi va
 * ikkalasini ajratish uchun murakkab kod kerak bo'ladi.
 *
 * Chap/o'ng tugmalari esa har qanday qurilmada bir xil ishlaydi va
 * ekranni o'quvchi dastur ham ularni o'qiy oladi.
 *
 * ── Nima uchun tartib DARHOL yuborilmaydi ─────────────────────────────
 * Har bosishda so'rov yuborilsa, tez ikki marta bosilganda javoblar
 * teskari tartibda kelib, natija chalkashib ketardi.
 *
 * Shuning uchun tartib avval ekranda o'zgaradi, so'rov esa BUTUN
 * ro'yxatni yuboradi — natija bir qiymatli.
 */

export interface CatalogImageManagerProps {
  owner: CatalogImageOwner;
  ownerId: string;
  images: CatalogImageView[];
  /** Ro'yxat o'zgarganda chaqiriladi — sahifa o'z holatini yangilaydi. */
  onChange: (images: CatalogImageView[]) => void;
  className?: string;
}

export function CatalogImageManager({
  owner,
  ownerId,
  images,
  onChange,
  className,
}: CatalogImageManagerProps) {
  const request = useApiClient();
  const { isUploading, error: uploadError, clearError, upload } = useFileUpload('CATALOG');

  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const basePath = catalogImagesPath(owner, ownerId);
  const isFull = images.length >= MAX_CATALOG_IMAGES;
  const isBusy = isUploading || isSaving;

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      clearError();

      const url = await upload(file);

      if (!url) return;

      setIsSaving(true);

      try {
        const result = await request<CatalogImagesResponse>(basePath, {
          method: 'POST',
          body: { url },
        });

        onChange(result.images);
      } catch (caught) {
        setError(toUserMessage(caught));
      } finally {
        setIsSaving(false);
      }
    },
    [basePath, clearError, onChange, request, upload],
  );

  const handleRemove = useCallback(
    async (image: CatalogImageView) => {
      setError(null);
      setIsSaving(true);

      try {
        const result = await request<CatalogImagesResponse>(`${basePath}/${image.id}`, {
          method: 'DELETE',
        });

        onChange(result.images);
      } catch (caught) {
        setError(toUserMessage(caught));
      } finally {
        setIsSaving(false);
      }
    },
    [basePath, onChange, request],
  );

  const handleMove = useCallback(
    async (index: number, direction: -1 | 1) => {
      const target = index + direction;

      if (target < 0 || target >= images.length) return;

      const next = [...images];
      const [moved] = next.splice(index, 1);

      next.splice(target, 0, moved);

      /**
       * Ekran DARHOL yangilanadi.
       *
       * Server javobini kutish 300-800 ms va bu vaqt ichida rasm
       * qimirlamasdi — odam tugma ishlamadi deb o'ylardi.
       */
      onChange(next.map((image, order) => ({ ...image, sortOrder: order })));

      setError(null);
      setIsSaving(true);

      try {
        const result = await request<CatalogImagesResponse>(basePath, {
          method: 'PUT',
          body: { imageIds: next.map((image) => image.id) },
        });

        onChange(result.images);
      } catch (caught) {
        setError(toUserMessage(caught));
        // Server rad etsa, HAQIQIY tartib qaytariladi.
        onChange(images);
      } finally {
        setIsSaving(false);
      }
    },
    [basePath, images, onChange, request],
  );

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Rasmlar</p>
        <p className="text-muted-foreground text-xs tabular-nums">
          {`${images.length}/${MAX_CATALOG_IMAGES}`}
        </p>
      </div>

      {(error ?? uploadError) && <Alert variant="error">{error ?? uploadError}</Alert>}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          // Maydon tozalanadi: aks holda bir xil faylni ikkinchi
          // marta tanlaganda hodisa umuman ishlamasdi.
          event.target.value = '';

          if (file) void handleFile(file);
        }}
      />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {images.map((image, index) => (
          <div key={image.id} className="space-y-1">
            <div className="border-border bg-secondary relative aspect-square overflow-hidden rounded-xl border">
              <img src={image.url} alt={image.alt} loading="lazy" className="size-full object-cover" />

              {index === 0 && (
                <span
                  className="absolute top-1 left-1 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white"
                  title="Ro'yxatda shu rasm ko'rinadi"
                >
                  <Star className="size-2.5 fill-current" aria-hidden="true" />
                  Asosiy
                </span>
              )}

              <button
                type="button"
                aria-label={`${index + 1}-rasmni o'chirish`}
                disabled={isBusy}
                onClick={() => void handleRemove(image)}
                className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white transition-colors hover:bg-red-600 disabled:opacity-60"
              >
                <Trash2 className="size-3" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                aria-label={`${index + 1}-rasmni chapga surish`}
                disabled={isBusy || index === 0}
                onClick={() => void handleMove(index, -1)}
                className="text-muted-foreground hover:bg-secondary hover:text-foreground inline-flex size-7 items-center justify-center rounded-lg transition-colors disabled:opacity-30"
              >
                <ArrowLeft className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`${index + 1}-rasmni o'ngga surish`}
                disabled={isBusy || index === images.length - 1}
                onClick={() => void handleMove(index, 1)}
                className="text-muted-foreground hover:bg-secondary hover:text-foreground inline-flex size-7 items-center justify-center rounded-lg transition-colors disabled:opacity-30"
              >
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}

        {!isFull && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'border-border text-muted-foreground hover:border-primary hover:text-foreground',
              'flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed',
              'transition-colors disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {isBusy ? (
              <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="size-5" aria-hidden="true" />
            )}
            <span className="text-[11px]">Rasm qo&apos;shish</span>
          </button>
        )}
      </div>

      <p className="text-muted-foreground text-xs">
        Birinchi rasm ro&apos;yxatlarda ko&apos;rinadi. Tartibni o&apos;q tugmalari bilan
        o&apos;zgartiring.
      </p>
    </div>
  );
}

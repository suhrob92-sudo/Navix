'use client';

import { useCallback, useState } from 'react';

import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { resizeImage } from '@/lib/image-resize';
import {
  AVATAR_MAX_DIMENSION,
  IMAGE_MAX_DIMENSION,
  MAX_UPLOAD_BYTES,
  formatFileSize,
  type UploadPurpose,
  type UploadResponse,
} from '@/modules/upload/upload.types';

/**
 * Rasm yuklash — tanlashdan manzilgacha.
 *
 * ── Nima uchun alohida hook ───────────────────────────────────────────
 * Rasm UCH joyda yuklanadi: post, chat va avatar. Uchalasida ham
 * ketma-ketlik bir xil: tekshir → kichraytir → yubor → manzilni ol.
 *
 * Bu ketma-ketlik har joyda qayta yozilsa, ertaga kichraytirish
 * o'lchami o'zgarganda uchta joyni tahrirlash kerak bo'lardi va
 * bittasi albatta unutilardi.
 */
export interface ImageUploadState {
  isUploading: boolean;
  error: string | null;
  clearError: () => void;
  /** @returns Yuklangan rasm manzili yoki `null` (xato bo'lsa). */
  upload: (file: File) => Promise<string | null>;
}

export function useImageUpload(purpose: UploadPurpose): ImageUploadState {
  const request = useApiClient();

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setError(null);

      /**
       * Tur BRAUZERDA ham tekshiriladi.
       *
       * Bu himoya emas (server baribir faylning o'zidan turini
       * aniqlaydi), balki QULAYLIK: noto'g'ri fayl tanlagan odam
       * javobni yuklashdan oldin, darhol ko'radi.
       */
      if (!file.type.startsWith('image/')) {
        setError('Faqat rasm tanlang.');

        return null;
      }

      setIsUploading(true);

      try {
        const maxDimension = purpose === 'AVATAR' ? AVATAR_MAX_DIMENSION : IMAGE_MAX_DIMENSION;
        const prepared = await resizeImage(file, maxDimension);

        if (prepared.size > MAX_UPLOAD_BYTES) {
          setError(`Rasm juda katta (${formatFileSize(prepared.size)}).`);

          return null;
        }

        const form = new FormData();
        form.append('purpose', purpose);
        form.append('file', prepared, file.name || 'rasm');

        /**
         * `Content-Type` QO'LDA qo'yilmaydi.
         *
         * `multipart` sarlavhasi ichida chegara belgisi bo'lishi
         * kerak va uni brauzer o'zi yozadi. Qo'lda yozilsa, chegara
         * tushib qolardi va server faylni umuman topa olmasdi.
         */
        const result = await request<UploadResponse>('/api/v1/uploads', {
          method: 'POST',
          body: form,
        });

        return result.url;
      } catch (caught) {
        setError(toUserMessage(caught));

        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [purpose, request],
  );

  const clearError = useCallback(() => setError(null), []);

  return { isUploading, error, clearError, upload };
}

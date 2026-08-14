'use client';

import { useCallback, useState } from 'react';

import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import type { LikeResponse, PostView } from '@/modules/feed/feed.types';

/**
 * Post ustidagi amallar: yoqtirish, tahrirlash, o'chirish va shikoyat.
 *
 * ── Nima uchun alohida hook ───────────────────────────────────────────
 * Bu amallar UCH joyda kerak: lenta, profildagi postlar va postning
 * o'z sahifasi. Uchalasida ham xuddi shu optimistik yangilash va
 * xatoni orqaga qaytarish mantig'i ishlaydi.
 *
 * @param update Ro'yxatni o'zgartiruvchi funksiya. Bitta post
 *               ko'rsatilayotgan sahifada ham shu ishlaydi — u yerda
 *               ro'yxat bitta elementdan iborat.
 */
export interface PostActions {
  /** Hozir qaysi post ustida amal ketmoqda (tugmani bloklash uchun). */
  busyPostId: string | null;
  error: string | null;
  clearError: () => void;
  toggleLike: (post: PostView) => void;
  editPost: (postId: string, body: string) => Promise<void>;
  deletePost: (postId: string) => void;
  reportPost: (postId: string, reason: string, note: string) => Promise<void>;
}

export function usePostActions(update: (updater: (current: PostView[]) => PostView[]) => void): PostActions {
  const request = useApiClient();

  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyLike = useCallback(
    (postId: string, isLiked: boolean, likeCount: number) => {
      update((current) => current.map((post) => (post.id === postId ? { ...post, isLiked, likeCount } : post)));
    },
    [update],
  );

  const toggleLike = useCallback(
    (post: PostView) => {
      const wasLiked = post.isLiked;

      setError(null);

      /**
       * Yurakcha DARHOL o'zgaradi.
       *
       * Serverdan javob kutilsa, bosgandan keyin bir soniya hech narsa
       * o'zgarmasdi va odam ikkinchi marta bosardi — natijada
       * yoqtirish qo'yilib, darhol olib tashlanardi.
       */
      applyLike(post.id, !wasLiked, post.likeCount + (wasLiked ? -1 : 1));

      void (async () => {
        try {
          const result = await request<LikeResponse>(`/api/v1/posts/${post.id}/like`, {
            method: wasLiked ? 'DELETE' : 'POST',
            ...(wasLiked ? {} : { body: {} }),
          });

          // Server aniq sonni qaytaradi — taxmin bilan haqiqat ajralib qolmaydi.
          applyLike(post.id, result.isLiked, result.likeCount);
        } catch (caught) {
          applyLike(post.id, wasLiked, post.likeCount);
          setError(toUserMessage(caught));
        }
      })();
    },
    [applyLike, request],
  );

  const deletePost = useCallback(
    (postId: string) => {
      setBusyPostId(postId);
      setError(null);

      void (async () => {
        try {
          await request(`/api/v1/posts/${postId}`, { method: 'DELETE' });

          /**
           * Post ro'yxatdan OLIB TASHLANADI.
           *
           * Serverda u "o'chirilgan" holatiga o'tadi va izohlari
           * saqlanadi, lekin o'chirgan odamning lentasida turishining
           * ma'nosi yo'q.
           */
          update((current) => current.filter((post) => post.id !== postId));
        } catch (caught) {
          setError(toUserMessage(caught));
        } finally {
          setBusyPostId(null);
        }
      })();
    },
    [request, update],
  );

  /**
   * Tahrirlash — optimistik EMAS.
   *
   * Yoqtirishdan farqi: bu yerda server matnni qisqartirishi yoki
   * rad etishi mumkin (bo'sh post). Oldindan almashtirilsa, xato
   * bo'lganda ekranda saqlanmagan matn turib qolardi.
   */
  const editPost = useCallback(
    async (postId: string, body: string) => {
      setBusyPostId(postId);
      setError(null);

      try {
        const result = await request<{ post: PostView }>(`/api/v1/posts/${postId}`, {
          method: 'PATCH',
          body: { body },
        });

        update((current) => current.map((post) => (post.id === postId ? { ...post, ...result.post } : post)));
      } catch (caught) {
        setError(toUserMessage(caught));
      } finally {
        setBusyPostId(null);
      }
    },
    [request, update],
  );

  /**
   * Shikoyat — ro'yxat O'ZGARMAYDI.
   *
   * Post joyida qoladi: uni yashirish moderatorning ishi. Odamga
   * "yubordim" degan tasdiq kartochkaning o'zida ko'rsatiladi.
   */
  const reportPost = useCallback(
    async (postId: string, reason: string, note: string) => {
      setBusyPostId(postId);
      setError(null);

      try {
        await request(`/api/v1/posts/${postId}/report`, {
          method: 'POST',
          body: { reason, ...(note.trim() ? { note: note.trim() } : {}) },
        });
      } catch (caught) {
        setError(toUserMessage(caught));
      } finally {
        setBusyPostId(null);
      }
    },
    [request],
  );

  const clearError = useCallback(() => setError(null), []);

  return { busyPostId, error, clearError, toggleLike, editPost, deletePost, reportPost };
}

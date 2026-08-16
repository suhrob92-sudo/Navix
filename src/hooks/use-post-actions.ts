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
  /**
   * Ikki marta bosilganda — FAQAT qo'yadi, olib tashlamaydi.
   *
   * Instagramda ham shunday: tez-tez bosilganda yoqtirish
   * tasodifan o'chib ketmasligi kerak.
   */
  likeOnly: (post: PostView) => void;
  toggleSave: (post: PostView) => void;
  sharePost: (post: PostView) => Promise<void>;
  /** Videodagi biriktirma tugmasi bosildi — muallif ko'rsatkichi uchun. */
  trackAttachmentClick: (postId: string, attachmentId: string) => void;
  editPost: (postId: string, body: string) => Promise<void>;
  deletePost: (postId: string) => void;
  reportPost: (postId: string, reason: string, note: string) => Promise<void>;
  /**
   * "Bu qiziq emas" — post yashiriladi.
   *
   * Ro'yxatdan DARHOL olib tashlanmaydi: uning o'rnida "qaytarish"
   * yozuvi turadi. Sababi pastda, `hiddenIds` izohida.
   */
  hidePost: (postId: string) => void;
  undoHide: (postId: string) => void;
  /**
   * Shu sahifada yashirilgan postlar.
   *
   * ── Nima uchun post ro'yxatdan OLIB TASHLANMAYDI ────────────────────
   * Yashirish tugmasi menyuda turadi va tasodifan bosilishi oson.
   * Post shu zahoti yo'q bo'lsa, uni qaytarishning yo'li qolmasdi:
   * odam nomini ham, muallifini ham eslay olmaydi.
   *
   * Shuning uchun uning o'rnida "Qaytarish" tugmasi qoladi va u
   * faqat sahifa yangilanganda yo'qoladi.
   */
  hiddenIds: Set<string>;
}

export function usePostActions(update: (updater: (current: PostView[]) => PostView[]) => void): PostActions {
  const request = useApiClient();

  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());

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

  const likeOnly = useCallback(
    (post: PostView) => {
      if (post.isLiked) return;

      toggleLike(post);
    },
    [toggleLike],
  );

  /**
   * Saqlash — optimistik, yoqtirish bilan bir xil sabab.
   *
   * Xato bo'lsa belgi orqaga qaytadi: odam "saqladim" deb o'ylab,
   * ro'yxatda topa olmasligi eng yomon holat bo'lardi.
   */
  const toggleSave = useCallback(
    (post: PostView) => {
      const wasSaved = post.isSaved;

      setError(null);
      update((current) =>
        current.map((item) => (item.id === post.id ? { ...item, isSaved: !wasSaved } : item)),
      );

      void (async () => {
        try {
          await request(`/api/v1/posts/${post.id}/save`, {
            method: wasSaved ? 'DELETE' : 'POST',
            ...(wasSaved ? {} : { body: {} }),
          });
        } catch (caught) {
          update((current) =>
            current.map((item) => (item.id === post.id ? { ...item, isSaved: wasSaved } : item)),
          );
          setError(toUserMessage(caught));
        }
      })();
    },
    [request, update],
  );

  /**
   * Ulashish SONI.
   *
   * Ulashishning o'zi (Telegram, nusxalash) komponentda bajariladi —
   * bu yerda faqat son yangilanadi.
   *
   * ── Nima uchun xato YUTILADI ────────────────────────────────────────
   * Havola allaqachon nusxalangan yoki Telegramga uzatilgan bo'ladi.
   * "Ulashib bo'lmadi" degan xato yolg'on bo'lardi: ulashish bo'ldi,
   * faqat SON yangilanmadi.
   */
  const sharePost = useCallback(
    async (post: PostView) => {
      update((current) =>
        current.map((item) => (item.id === post.id ? { ...item, shareCount: item.shareCount + 1 } : item)),
      );

      try {
        await request(`/api/v1/posts/${post.id}/share`, { method: 'POST', body: {} });
      } catch {
        // Ataylab jim: yuqoridagi izohga qarang.
      }
    },
    [request, update],
  );

  /**
   * Mahsulot bosilishi.
   *
   * ── Nima uchun javob KUTILMAYDI ─────────────────────────────────────
   * Bosilgan zahoti brauzer mahsulot sahifasiga o'tadi. Javobni
   * kutish o'tishni sekinlashtirardi, foyda esa yo'q: son
   * sotuvchiga keyin kerak bo'ladi, hozir emas.
   */
  const trackAttachmentClick = useCallback(
    (postId: string, attachmentId: string) => {
      void request(`/api/v1/posts/${postId}/attachments/${attachmentId}/click`, {
        method: 'POST',
        body: {},
      }).catch(() => {});
    },
    [request],
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

  /**
   * Yashirilganlar ro'yxatini o'zgartiradi.
   *
   * ── Nima uchun HAR SAFAR yangi `Set` ────────────────────────────────
   * React o'zgarishni havola bo'yicha taqqoslaydi. Mavjud to'plamga
   * qo'shsak, havola o'zgarmasdi va ekran yangilanmasdi — tugma
   * bosilar, lekin hech narsa bo'lmasdi.
   */
  const applyHidden = useCallback((postId: string, isHidden: boolean) => {
    setHiddenIds((current) => {
      const next = new Set(current);

      if (isHidden) {
        next.add(postId);
      } else {
        next.delete(postId);
      }

      return next;
    });
  }, []);

  /**
   * "Bu qiziq emas" — OPTIMISTIK.
   *
   * Yoqtirish bilan bir xil sabab: javob kutilsa, bosgandan keyin
   * post joyida turib qolardi va odam ikkinchi marta bosardi.
   */
  const hidePost = useCallback(
    (postId: string) => {
      setError(null);
      applyHidden(postId, true);

      void (async () => {
        try {
          await request(`/api/v1/posts/${postId}/hide`, { method: 'POST', body: {} });
        } catch (caught) {
          applyHidden(postId, false);
          setError(toUserMessage(caught));
        }
      })();
    },
    [applyHidden, request],
  );

  const undoHide = useCallback(
    (postId: string) => {
      setError(null);
      applyHidden(postId, false);

      void (async () => {
        try {
          await request(`/api/v1/posts/${postId}/hide`, { method: 'DELETE' });
        } catch (caught) {
          applyHidden(postId, true);
          setError(toUserMessage(caught));
        }
      })();
    },
    [applyHidden, request],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    busyPostId,
    error,
    clearError,
    toggleLike,
    likeOnly,
    toggleSave,
    sharePost,
    trackAttachmentClick,
    editPost,
    deletePost,
    reportPost,
    hidePost,
    undoHide,
    hiddenIds,
  };
}

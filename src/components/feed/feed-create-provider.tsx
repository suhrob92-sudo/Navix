'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

import { CreateMenu } from '@/components/feed/create-menu';
import { PostComposer, type ComposerDraft } from '@/components/feed/post-composer';
import { StoryComposer } from '@/components/story/story-composer';
import { Alert } from '@/components/ui/alert';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import type { PostView } from '@/modules/feed/feed.types';

export type PostedHandler = (post: PostView) => void;

export interface FeedCreateContextValue {
  /** "Nima joylaysiz?" oynasini ochadi. */
  open: () => void;
  /**
   * Yangi post joylanganda xabar beradi.
   *
   * Qaytgan funksiya obunani bekor qiladi — komponent ekrandan
   * ketganda uni chaqirish SHART, aks holda xotira sizib ketadi.
   */
  subscribe: (handler: PostedHandler) => () => void;
}

const FeedCreateContext = createContext<FeedCreateContextValue | null>(null);

/**
 * Feed ichidagi "yaratish" boshqaruvi.
 *
 * ── Nima uchun QOLIP darajasida ───────────────────────────────────────
 * "+" tugmasi endi Feed'ning pastki panelida turadi va u BARCHA Feed
 * sahifalarida bir xil ishlashi kerak: qidiruvda turib ham video
 * joylay olish kerak.
 *
 * Agar yozish oynasi lenta sahifasining ichida qolsa, u faqat o'sha
 * sahifada ishlardi va qolgan sahifalarda tugma jim turardi.
 *
 * ── Nima uchun "obuna" (subscribe) kerak ──────────────────────────────
 * Post joylangach, lenta uni DARHOL ko'rsatishi kerak. Butun lentani
 * qayta yuklash ham mumkin edi, lekin unda odam o'qib turgan joyi
 * yo'qolardi va mobil trafik bekorga sarflanardi.
 *
 * Shuning uchun qolip xabar beradi, lenta esa eshitib turadi va yangi
 * postni ro'yxat boshiga qo'yadi.
 */
export function FeedCreateProvider({ children }: { children: React.ReactNode }) {
  const request = useApiClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Video tanlash oynasi darhol ochilsinmi.
   *
   * "+" dan "Video" tanlanganda yozish maydoni ochiladi va u fayl
   * tanlagichni O'ZI ochadi — odam ikkinchi marta bosmaydi.
   */
  const [autoPick, setAutoPick] = useState<'VIDEO' | null>(null);

  /**
   * Eshituvchilar `useRef` da — `useState` da bo'lsa, har bir obuna
   * butun daraxtni qayta chizardi.
   */
  const handlersRef = useRef(new Set<PostedHandler>());

  const subscribe = useCallback((handler: PostedHandler) => {
    handlersRef.current.add(handler);

    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const open = useCallback(() => {
    setError(null);
    setIsCreateOpen(true);
  }, []);

  const value = useMemo<FeedCreateContextValue>(() => ({ open, subscribe }), [open, subscribe]);

  async function publish(draft: ComposerDraft): Promise<boolean> {
    setIsSending(true);
    setError(null);

    try {
      const result = await request<{ post: PostView }>('/api/v1/posts', {
        method: 'POST',
        /**
         * Bo'sh maydonlar YUBORILMAYDI.
         *
         * Sxema `undefined` ni ixtiyoriy deb qabul qiladi, `null` ni
         * esa yo'q — shuning uchun ular umuman qo'shilmaydi.
         */
        body: {
          body: draft.body,
          ...(draft.imageUrl ? { imageUrl: draft.imageUrl } : {}),
          ...(draft.videoUrl ? { videoUrl: draft.videoUrl } : {}),
          ...(draft.videoPosterUrl ? { videoPosterUrl: draft.videoPosterUrl } : {}),
          ...(draft.videoSeconds ? { videoSeconds: draft.videoSeconds } : {}),
          /*
            Kesim IKKALASI birga yuboriladi.

            Server yarim kesimni rad etadi va bu to'g'ri: yarmi bilan
            pleyer qayerda to'xtashini bilmasdi.

            Shart `!== null` bo'yicha, oddiy rostlik bo'yicha emas:
            `videoStartSeconds` nolga teng bo'lishi mumkin va u
            butunlay qonuniy qiymat ("boshidan boshla, oxirini kes").
          */
          ...(draft.videoStartSeconds !== null && draft.videoEndSeconds !== null
            ? {
                videoStartSeconds: draft.videoStartSeconds,
                videoEndSeconds: draft.videoEndSeconds,
              }
            : {}),
          ...(draft.category ? { category: draft.category } : {}),
          ...(draft.place ? { place: draft.place } : {}),
          /*
            Reklama belgisi HAR DOIM yuboriladi.

            Qolgan maydonlar kabi "bor bo'lsa qo'sh" qilinsa,
            `false` qiymat umuman ketmasdi. Hozir bu zararsiz
            (server odatiy `false` qo'yadi), lekin ertaga
            tahrirlashda belgini OLIB TASHLASH imkonsiz bo'lardi.
          */
          isSponsored: draft.isSponsored,
          ...(draft.attachments.length > 0 ? { attachments: draft.attachments } : {}),
          /*
            Chaqiruv qiymati BO'SH bo'lsa yuborilmaydi.

            `FOLLOW` va `MESSAGE` da qiymat yo'q va uni `null` sifatida
            yuborsak, sxema uni rad etardi (`optional` — `undefined`
            ni qabul qiladi, `null` ni emas).
          */
          ...(draft.cta
            ? { cta: { kind: draft.cta.kind, ...(draft.cta.value ? { value: draft.cta.value } : {}) } }
            : {}),
        },
      });

      for (const handler of handlersRef.current) handler(result.post);

      setIsComposerOpen(false);
      setAutoPick(null);

      return true;
    } catch (caught) {
      setError(toUserMessage(caught));

      return false;
    } finally {
      setIsSending(false);
    }
  }

  return (
    <FeedCreateContext.Provider value={value}>
      {children}

      {/*
        Xato yozuvi oynadan TASHQARIDA ham ko'rinadi: yuborish
        muvaffaqiyatsiz bo'lsa oyna ochiq qoladi va xato uning
        ichida chiqadi, lekin tarmoq uzilib oyna yopilib qolsa
        odam sababni baribir ko'rishi kerak.
      */}
      {error && !isComposerOpen && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 mx-auto max-w-lg px-4">
          <div className="pointer-events-auto">
            <Alert variant="error">{error}</Alert>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <CreateMenu
          onClose={() => setIsCreateOpen(false)}
          onPick={(choice) => {
            setIsCreateOpen(false);

            if (choice === 'STORY') {
              setIsStoryOpen(true);

              return;
            }

            setAutoPick(choice === 'VIDEO' ? 'VIDEO' : null);
            setIsComposerOpen(true);
          }}
        />
      )}

      {isComposerOpen && (
        <PostComposer
          isSending={isSending}
          autoPick={autoPick}
          error={error}
          onSubmit={publish}
          onClose={() => {
            setIsComposerOpen(false);
            setAutoPick(null);
            setError(null);
          }}
        />
      )}

      {isStoryOpen && (
        <StoryComposer onClose={() => setIsStoryOpen(false)} onPosted={() => setIsStoryOpen(false)} />
      )}
    </FeedCreateContext.Provider>
  );
}

/**
 * Feed'ning yaratish boshqaruvi.
 *
 * Qolipdan tashqarida chaqirilsa ataylab xato beradi: jim `null`
 * qaytarsak, tugma bosilganda hech narsa bo'lmasdi va sababini
 * topish uchun soatlab qidirishga to'g'ri kelardi.
 */
export function useFeedCreate(): FeedCreateContextValue {
  const context = useContext(FeedCreateContext);

  if (!context) {
    throw new Error('useFeedCreate faqat FeedCreateProvider ichida ishlaydi');
  }

  return context;
}

/* eslint-disable @next/next/no-img-element */
'use client';

import { Image as ImageIcon, Send, ShoppingBag, Video, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ProductPicker } from '@/components/feed/product-picker';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApiClient } from '@/hooks/use-api';
import { useFileUpload } from '@/hooks/use-file-upload';
import { dialogCancelHandler } from '@/lib/dialog';
import { toUserMessage } from '@/lib/api-client';
import { formatTiyin } from '@/lib/money';
import { uploadVideo } from '@/lib/video-upload';
import { useAuth } from '@/modules/auth/auth-context';
import type { TaggedProductView } from '@/modules/feed/feed.types';
import {
  MAX_STORY_SECONDS,
  STORY_CAPTION_MAX_LENGTH,
  STORY_LIFETIME_HOURS,
} from '@/modules/story/story.types';

export interface StoryComposerProps {
  onClose: () => void;
  onPosted: () => void;
}

/**
 * Hikoya joylash oynasi.
 *
 * ── Nima uchun matn maydoni KICHIK ────────────────────────────────────
 * Hikoya — ko'rinadigan narsa. Katta matn maydoni odamni yozishga
 * undardi va natijada rasm ustida uzun matn turgan hikoyalar paydo
 * bo'lardi — ularni bir necha soniyada o'qib bo'lmaydi.
 *
 * ── Nima uchun mahsulot BITTA ─────────────────────────────────────────
 * Hikoya besh soniya ko'rinadi. Ro'yxat qo'yishga vaqt ham, joy ham
 * yo'q; bitta tugma esa aynan shu qisqa vaqtga mos.
 */
export function StoryComposer({ onClose, onPosted }: StoryComposerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const request = useApiClient();
  const { accessToken } = useAuth();

  const image = useFileUpload('POST');

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [video, setVideo] = useState<{ url: string; posterUrl: string | null; seconds: number } | null>(null);
  const [caption, setCaption] = useState('');
  const [product, setProduct] = useState<TaggedProductView | null>(null);

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const hasMedia = imageUrl !== null || video !== null;
  const isBusy = isSending || image.isUploading || isUploadingVideo;

  async function attachImage(file: File) {
    const url = await image.upload(file);

    if (url) {
      setImageUrl(url);
      setVideo(null);
    }
  }

  async function attachVideo(file: File) {
    setIsUploadingVideo(true);
    setError(null);

    try {
      const result = await uploadVideo(file, accessToken);

      if (result.seconds > MAX_STORY_SECONDS) {
        setError(`Hikoya videosi ${MAX_STORY_SECONDS} soniyadan uzun bo'lmasligi kerak.`);

        return;
      }

      setVideo({ url: result.videoUrl, posterUrl: result.posterUrl, seconds: result.seconds });
      setImageUrl(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Videoni yuklab bo'lmadi.");
    } finally {
      setIsUploadingVideo(false);
    }
  }

  async function send() {
    if (!hasMedia || isBusy) return;

    setIsSending(true);
    setError(null);

    try {
      await request('/api/v1/stories', {
        method: 'POST',
        body: {
          ...(caption.trim() ? { caption: caption.trim() } : {}),
          ...(imageUrl ? { imageUrl } : {}),
          ...(video ? { videoUrl: video.url, videoSeconds: video.seconds } : {}),
          ...(video?.posterUrl ? { videoPosterUrl: video.posterUrl } : {}),
          ...(product ? { productId: product.id } : {}),
        },
      });

      onPosted();
    } catch (caught) {
      setError(toUserMessage(caught));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={dialogCancelHandler(onClose)}
      className="glass animate-scale-in text-foreground m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-5 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Hikoya joylash</h2>

        <Button variant="ghost" size="icon" aria-label="Yopish" onClick={onClose}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>

      {(error || image.error) && (
        <Alert variant="error" className="mb-3">
          {error ?? image.error}
        </Alert>
      )}

      {/* Biriktirilgan media — ko'rinishi bilan tasdiqlanadi. */}
      {hasMedia ? (
        <div className="border-border relative overflow-hidden rounded-xl border">
          <img
            src={imageUrl ?? video?.posterUrl ?? ''}
            alt=""
            className="max-h-64 w-full bg-black object-contain"
          />

          {video && (
            <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
              {`${video.seconds} soniya`}
            </span>
          )}

          <button
            type="button"
            aria-label="Olib tashlash"
            disabled={isBusy}
            onClick={() => {
              setImageUrl(null);
              setVideo(null);
              setProduct(null);
            }}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white transition-transform active:scale-95 disabled:opacity-60"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="border-border hover:bg-secondary flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-6 transition-colors">
            <ImageIcon className="text-muted-foreground size-6" aria-hidden="true" />
            <span className="text-xs">{image.isUploading ? 'Yuklanmoqda…' : 'Rasm'}</span>

            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={isBusy}
              onChange={(event) => {
                const file = event.target.files?.[0];

                event.target.value = '';

                if (file) void attachImage(file);
              }}
            />
          </label>

          <label className="border-border hover:bg-secondary flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-6 transition-colors">
            <Video className="text-muted-foreground size-6" aria-hidden="true" />
            <span className="text-xs">{isUploadingVideo ? 'Yuklanmoqda…' : 'Video'}</span>

            <input
              type="file"
              accept="video/*"
              className="sr-only"
              disabled={isBusy}
              onChange={(event) => {
                const file = event.target.files?.[0];

                event.target.value = '';

                if (file) void attachVideo(file);
              }}
            />
          </label>
        </div>
      )}

      {hasMedia && (
        <>
          <label htmlFor="story-caption" className="sr-only">
            Hikoya izohi
          </label>

          <Input
            id="story-caption"
            value={caption}
            maxLength={STORY_CAPTION_MAX_LENGTH}
            disabled={isBusy}
            placeholder="Qisqa izoh (ixtiyoriy)"
            className="mt-3"
            onChange={(event) => setCaption(event.target.value)}
          />

          {product ? (
            <div className="border-border bg-secondary/40 mt-3 flex items-center gap-3 rounded-xl border p-2.5">
              <span className="bg-secondary text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                <ShoppingBag className="size-4" aria-hidden="true" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{product.name}</span>
                <span className="text-muted-foreground block truncate text-xs">
                  {`${formatTiyin(product.priceTiyin)} · ${product.shopName}`}
                </span>
              </span>

              <button
                type="button"
                aria-label="Mahsulotni olib tashlash"
                onClick={() => setProduct(null)}
                className="text-muted-foreground hover:text-destructive -m-1 shrink-0 rounded-lg p-1 transition-colors"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3"
              disabled={isBusy}
              onClick={() => setIsPickerOpen(true)}
            >
              <ShoppingBag className="size-4" aria-hidden="true" />
              Mahsulot biriktirish
            </Button>
          )}
        </>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          {`${STORY_LIFETIME_HOURS} soatdan keyin o'chadi`}
        </p>

        <Button
          size="sm"
          disabled={!hasMedia || isBusy}
          isLoading={isSending}
          loadingText="Yuborilmoqda..."
          onClick={() => void send()}
        >
          <Send className="size-4" aria-hidden="true" />
          Joylash
        </Button>
      </div>

      {/*
        Ochiq ogohlantirish: ko'rgan odamlar ro'yxatini muallif ko'radi.

        Yashirin kuzatuv bo'lmasligi kerak — odam nimaga rozi
        bo'layotganini bilishi shart.
      */}
      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
        Hikoyangizni kim ko&apos;rgani sizga ko&apos;rinadi. Xuddi shunday, siz boshqa
        odamning hikoyasini ochsangiz — u ham buni ko&apos;radi.
      </p>

      {isPickerOpen && (
        <ProductPicker
          selected={product ? [product] : []}
          onPick={(picked) => {
            setProduct(picked);
            setIsPickerOpen(false);
          }}
          onRemove={() => setProduct(null)}
          onCancel={() => setIsPickerOpen(false)}
        />
      )}
    </dialog>
  );
}

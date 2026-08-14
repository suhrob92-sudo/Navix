'use client';

import { Send, ShoppingBag, Video, X } from 'lucide-react';
import { useState } from 'react';

import { ProductPicker } from '@/components/feed/product-picker';
import { ImageAttach } from '@/components/upload/image-attach';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useFileUpload } from '@/hooks/use-file-upload';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import { uploadVideo } from '@/lib/video-upload';
import { useAuth } from '@/modules/auth/auth-context';
import { POST_MAX_LENGTH, type TaggedProductView } from '@/modules/feed/feed.types';
import { MAX_VIDEO_SECONDS, formatDuration } from '@/modules/upload/upload.types';

/** Yuborilayotgan postning to'liq tarkibi. */
export interface ComposerDraft {
  body: string;
  imageUrl: string | null;
  videoUrl: string | null;
  videoPosterUrl: string | null;
  videoSeconds: number | null;
  productId: string | null;
}

export interface PostComposerProps {
  isSending: boolean;
  onSubmit: (draft: ComposerDraft) => Promise<boolean>;
}

/**
 * Post yozish maydoni.
 *
 * ── Nima uchun matn SHU YERDA saqlanadi ──────────────────────────────
 * Yozilayotgan matn ota komponentga chiqarilsa, lenta har yangilanganda
 * (yoqtirish, yangi post) qayta chizilib, yozib bo'lingan matn
 * yo'qolib ketardi.
 *
 * `onSubmit` `true` qaytarsa — yuborildi, maydon tozalanadi. `false`
 * bo'lsa matn joyida qoladi: xato bo'lganda odam hammasini qaytadan
 * yozishga majbur bo'lmasligi kerak.
 *
 * ── Nima uchun rasm va video BIRGA bo'lmaydi ─────────────────────────
 * Ikkalasi ham bo'lsa, lentada qaysi birini ko'rsatish noaniq
 * bo'lardi. Bitta postda bitta media — qoida oddiy va tushunarli.
 */
export function PostComposer({ isSending, onSubmit }: PostComposerProps) {
  const { accessToken } = useAuth();

  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [video, setVideo] = useState<{ url: string; posterUrl: string | null; seconds: number } | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  const [product, setProduct] = useState<TaggedProductView | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const image = useFileUpload('POST');

  const trimmed = body.trim();
  /**
   * Rasm yoki video o'zi ham post bo'la oladi.
   *
   * "Mana shu manzara" degan postga matn shart emas.
   */
  const isEmpty = trimmed.length === 0 && imageUrl === null && video === null;
  const remaining = POST_MAX_LENGTH - body.length;
  const isBusy = isSending || image.isUploading || isUploadingVideo;

  async function send() {
    if (isEmpty || isBusy) return;

    const sent = await onSubmit({
      body: trimmed,
      imageUrl,
      videoUrl: video?.url ?? null,
      videoPosterUrl: video?.posterUrl ?? null,
      videoSeconds: video?.seconds ?? null,
      productId: product?.id ?? null,
    });

    if (sent) {
      setBody('');
      setImageUrl(null);
      setVideo(null);
      setProduct(null);
      setVideoError(null);
    }
  }

  async function attachImage(file: File) {
    const url = await image.upload(file);

    if (url) setImageUrl(url);
  }

  async function attachVideo(file: File) {
    setIsUploadingVideo(true);
    setVideoError(null);

    try {
      const result = await uploadVideo(file, accessToken);

      setVideo({ url: result.videoUrl, posterUrl: result.posterUrl, seconds: result.seconds });
      // Video biriktirilganda rasm o'rnini bo'shatadi.
      setImageUrl(null);
    } catch (error) {
      setVideoError(error instanceof Error ? error.message : "Videoni yuklab bo'lmadi.");
    } finally {
      setIsUploadingVideo(false);
    }
  }

  return (
    <form
      className="bg-card border-border rounded-2xl border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <label htmlFor="post-body" className="sr-only">
        Post matni
      </label>

      <Textarea
        id="post-body"
        rows={3}
        maxLength={POST_MAX_LENGTH}
        value={body}
        disabled={isSending}
        placeholder="Nima yangilik?"
        onChange={(event) => setBody(event.target.value)}
      />

      {image.error && (
        <Alert variant="error" className="mt-3">
          {image.error}
        </Alert>
      )}

      {videoError && (
        <Alert variant="error" className="mt-3">
          {videoError}
        </Alert>
      )}

      {/* Biriktirilgan video — muqovasi bilan. */}
      {video && (
        <div className="border-border relative mt-3 overflow-hidden rounded-xl border">
          {video.posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={video.posterUrl} alt="" className="max-h-56 w-full object-cover" />
          ) : (
            <div className="bg-secondary flex h-32 items-center justify-center">
              <Video className="text-muted-foreground size-8" aria-hidden="true" />
            </div>
          )}

          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            {formatDuration(video.seconds)}
          </span>

          <button
            type="button"
            aria-label="Videoni olib tashlash"
            disabled={isBusy}
            onClick={() => {
              setVideo(null);
              setProduct(null);
            }}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white transition-transform active:scale-95 disabled:opacity-60"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Biriktirilgan mahsulot — faqat video bo'lganda. */}
      {product && (
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
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Rasm faqat video biriktirilmagan bo'lsa. */}
        {!video && (
          <ImageAttach
            value={imageUrl}
            isUploading={image.isUploading}
            disabled={isBusy}
            onSelect={(file) => void attachImage(file)}
            onRemove={() => setImageUrl(null)}
          />
        )}

        {/* Video faqat rasm biriktirilmagan bo'lsa. */}
        {!imageUrl && !video && (
          <label
            className={cn(
              'text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1.5 rounded-lg p-2 text-sm transition-colors',
              isBusy && 'pointer-events-none opacity-60',
            )}
          >
            <Video className="size-5" aria-hidden="true" />
            <span className="text-xs">{isUploadingVideo ? 'Yuklanmoqda…' : 'Video'}</span>

            <input
              type="file"
              accept="video/*"
              className="sr-only"
              disabled={isBusy}
              onChange={(event) => {
                const file = event.target.files?.[0];

                // Maydon tozalanadi: bir xil faylni qayta tanlash ham
                // hodisa hosil qilishi kerak.
                event.target.value = '';

                if (file) void attachVideo(file);
              }}
            />
          </label>
        )}

        {/*
          Mahsulot tugmasi FAQAT video biriktirilganda ko'rinadi.

          Oddiy postda tugma qo'yadigan joy yo'q va u reklama uchun
          eng oson yo'lga aylanardi.
        */}
        {video && !product && (
          <Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={() => setIsPickerOpen(true)}>
            <ShoppingBag className="size-4" aria-hidden="true" />
            Mahsulot
          </Button>
        )}

        {/*
          Qolgan belgilar soni FAQAT oxiriga yaqinlashganda ko'rinadi.
          Doim ko'rinsa, u qisqa yozishga undab turadigan ortiqcha
          bosim bo'lardi.
        */}
        <span
          className={cn(
            'ml-auto text-xs tabular-nums',
            remaining > 100 ? 'invisible' : remaining < 0 ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {remaining}
        </span>

        <Button type="submit" size="sm" disabled={isEmpty || isBusy} isLoading={isSending} loadingText="Yuborilmoqda...">
          <Send className="size-4" aria-hidden="true" />
          Joylash
        </Button>
      </div>

      <p className="text-muted-foreground mt-2 text-xs">
        {`Video ${MAX_VIDEO_SECONDS} soniyagacha. Videoga mahsulot biriktirsangiz, tomoshabin uni bir bosishda topadi.`}
      </p>

      {isPickerOpen && (
        <ProductPicker
          onPick={(picked) => {
            setProduct(picked);
            setIsPickerOpen(false);
          }}
          onCancel={() => setIsPickerOpen(false)}
        />
      )}
    </form>
  );
}

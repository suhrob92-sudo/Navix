'use client';

import { Send } from 'lucide-react';
import { useState } from 'react';

import { ImageAttach } from '@/components/upload/image-attach';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useFileUpload } from '@/hooks/use-file-upload';
import { cn } from '@/lib/utils';
import { POST_MAX_LENGTH } from '@/modules/feed/feed.types';

export interface PostComposerProps {
  isSending: boolean;
  onSubmit: (body: string, imageUrl: string | null) => Promise<boolean>;
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
 */
export function PostComposer({ isSending, onSubmit }: PostComposerProps) {
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const image = useFileUpload('POST');

  const trimmed = body.trim();
  /**
   * Rasm o'zi ham post bo'la oladi.
   *
   * "Mana shu manzara" degan postga matn shart emas — shuning uchun
   * tugma matn YOKI rasm bo'lsa ochiladi.
   */
  const isEmpty = trimmed.length === 0 && imageUrl === null;
  const remaining = POST_MAX_LENGTH - body.length;

  async function send() {
    if (isEmpty || isSending || image.isUploading) return;

    if (await onSubmit(trimmed, imageUrl)) {
      setBody('');
      setImageUrl(null);
    }
  }

  async function attach(file: File) {
    const url = await image.upload(file);

    if (url) setImageUrl(url);
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

      <div className="mt-3 flex items-center justify-between gap-3">
        <ImageAttach
          value={imageUrl}
          isUploading={image.isUploading}
          disabled={isSending}
          onSelect={(file) => void attach(file)}
          onRemove={() => setImageUrl(null)}
        />

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

        <Button
          type="submit"
          size="sm"
          disabled={isEmpty || image.isUploading}
          isLoading={isSending}
          loadingText="Yuborilmoqda..."
        >
          <Send className="size-4" aria-hidden="true" />
          Joylash
        </Button>
      </div>
    </form>
  );
}

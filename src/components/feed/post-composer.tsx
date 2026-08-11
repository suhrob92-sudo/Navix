'use client';

import { Send } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { POST_MAX_LENGTH } from '@/modules/feed/feed.types';

export interface PostComposerProps {
  isSending: boolean;
  onSubmit: (body: string) => Promise<boolean>;
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

  const trimmed = body.trim();
  const isEmpty = trimmed.length === 0;
  const remaining = POST_MAX_LENGTH - body.length;

  async function send() {
    if (isEmpty || isSending) return;

    if (await onSubmit(trimmed)) {
      setBody('');
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

      <div className="mt-3 flex items-center justify-between gap-3">
        {/*
          Qolgan belgilar soni FAQAT oxiriga yaqinlashganda ko'rinadi.
          Doim ko'rinsa, u qisqa yozishga undab turadigan ortiqcha
          bosim bo'lardi.
        */}
        <span
          className={cn(
            'text-xs tabular-nums',
            remaining > 100 ? 'invisible' : remaining < 0 ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {remaining}
        </span>

        <Button type="submit" size="sm" disabled={isEmpty} isLoading={isSending} loadingText="Yuborilmoqda...">
          <Send className="size-4" aria-hidden="true" />
          Joylash
        </Button>
      </div>
    </form>
  );
}

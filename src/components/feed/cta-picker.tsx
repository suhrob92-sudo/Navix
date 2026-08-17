'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dialogCancelHandler } from '@/lib/dialog';
import { cn } from '@/lib/utils';
import {
  CTA_HANDLE_PATTERN,
  POST_CTA_CONFIG,
  POST_CTA_KINDS,
  cleanHandle,
  type PostCtaKindName,
} from '@/config/post-cta';

/** Tanlangan chaqiruv — kompozitor shu shaklda saqlaydi. */
export interface PickedCta {
  kind: PostCtaKindName;
  /** `FOLLOW` va `MESSAGE` da bo'sh. */
  value: string | null;
}

export interface CtaPickerProps {
  /** Hozirgi tanlov — oyna qayta ochilganda saqlanadi. */
  value: PickedCta | null;
  onPick: (cta: PickedCta) => void;
  onClear: () => void;
  onCancel: () => void;
}

/**
 * Videoning chaqiruvini tanlash oynasi.
 *
 * ── Nima uchun BITTA tanlov ───────────────────────────────────────────
 * Biriktirmalar beshtagacha bo'lishi mumkin — ular turli narsalar.
 * Chaqiruv esa "endi nima qilay?" degan savolga javob va unga
 * ikkita javob berish javob bermaslik bilan barobar.
 *
 * ── Nima uchun to'liq MANZIL so'ralmaydi ──────────────────────────────
 * Ixtiyoriy manzil yozishga ruxsat bersak, video ustida istalgan
 * saytga olib boradigan tugma paydo bo'lardi — firibgarlik uchun
 * tayyor vosita.
 *
 * Shuning uchun faqat NOM so'raladi. Odam to'liq manzilni nusxalab
 * qo'ysa ham, u avtomatik tozalanadi — rad etish o'rniga.
 */
export function CtaPicker({ value, onPick, onClear, onCancel }: CtaPickerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [kind, setKind] = useState<PostCtaKindName>(value?.kind ?? 'FOLLOW');
  const [handle, setHandle] = useState(value?.value ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const config = POST_CTA_CONFIG[kind];

  function confirm() {
    if (!config.needsValue) {
      onPick({ kind, value: null });

      return;
    }

    const raw = handle.trim();

    if (raw.length === 0) {
      setError('Nom yoki raqam kiriting.');

      return;
    }

    if (kind === 'PHONE') {
      /*
        Telefon SERVERDA me'yorlashtiriladi.

        Bu yerda faqat eng qo'pol xato ushlanadi: raqamsiz matn.
        To'liq tekshiruvni takrorlash ikkita haqiqat manbasini
        yaratardi va ular albatta ajralib ketardi.
      */
      if (raw.replace(/\D/g, '').length < 9) {
        setError("Telefon raqami noto'g'ri. Namuna: +998 90 123 45 67");

        return;
      }

      onPick({ kind, value: raw });

      return;
    }

    const clean = cleanHandle(raw);

    if (!CTA_HANDLE_PATTERN.test(clean)) {
      setError("Nom noto'g'ri. Faqat harflar, raqamlar, nuqta va pastki chiziq.");

      return;
    }

    onPick({ kind, value: clean });
  }

  return (
    <dialog
      ref={dialogRef}
      onCancel={dialogCancelHandler(onCancel)}
      className="glass animate-scale-in text-foreground m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl p-5 backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Chaqiruv</h2>

        <Button variant="ghost" size="icon" aria-label="Yopish" onClick={onCancel}>
          <X className="size-5" aria-hidden="true" />
        </Button>
      </div>

      <p className="text-muted-foreground mb-4 text-xs leading-relaxed">
        Video tugagach tomoshabin nima qilsin? Bitta chaqiruv tanlang — ikkitasi javob
        bermaslik bilan barobar.
      </p>

      <div role="radiogroup" aria-label="Chaqiruv turi" className="grid grid-cols-2 gap-2">
        {POST_CTA_KINDS.map((item) => {
          const option = POST_CTA_CONFIG[item];
          const Icon = option.icon;
          const isActive = kind === item;

          return (
            <button
              key={item}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => {
                setKind(item);
                setError(null);
              }}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                isActive
                  ? 'border-primary bg-primary/10 font-medium'
                  : 'border-border hover:bg-secondary',
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 truncate">{option.label}</span>
            </button>
          );
        })}
      </div>

      {config.needsValue && (
        <div className="mt-4">
          <label htmlFor="cta-value" className="text-muted-foreground mb-1.5 block text-xs">
            {kind === 'PHONE' ? 'Telefon raqami' : 'Foydalanuvchi nomi'}
          </label>

          <Input
            id="cta-value"
            value={handle}
            onChange={(event) => {
              setHandle(event.target.value);
              setError(null);
            }}
            placeholder={config.placeholder}
            inputMode={kind === 'PHONE' ? 'tel' : 'text'}
            autoComplete="off"
          />

          {/*
            Cheklov HALOL aytiladi.

            Odam to'liq manzil yozmoqchi bo'lsa, nima uchun
            bo'lmasligini bilishi kerak — aks holda "ilova
            ishlamayapti" degan xulosa chiqarardi.
          */}
          <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
            {kind === 'PHONE'
              ? "Raqam videoni ko'rgan hammaga ko'rinadi."
              : 'Faqat nom kiritiladi — manzilni ilova o\'zi yasaydi. Bu begona saytga olib boradigan havolalarning oldini oladi.'}
          </p>
        </div>
      )}

      {error && (
        <Alert variant="error" className="mt-3">
          {error}
        </Alert>
      )}

      <div className="mt-4 flex gap-2">
        <Button type="button" fullWidth onClick={confirm}>
          Tanlash
        </Button>

        {/* Chaqiruvni olib tashlash — faqat allaqachon qo'yilgan bo'lsa. */}
        {value && (
          <Button type="button" variant="ghost" onClick={onClear}>
            Olib tashlash
          </Button>
        )}
      </div>
    </dialog>
  );
}

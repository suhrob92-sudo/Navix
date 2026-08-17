'use client';

import { Handshake } from 'lucide-react';

import { CREATOR_LINK_KINDS, creatorLinkConfig, type CreatorLinkKind } from '@/config/creator';
import { ctaHref } from '@/config/post-cta';

export interface CreatorLinksProps {
  links: { kind: CreatorLinkKind; handle: string }[];
  isOpenToCollab: boolean;
  collabNote: string | null;
}

/**
 * Ijodkorning tarmoqlari va hamkorlik holati.
 *
 * ── Nima uchun havolalar BIR JOYDA ────────────────────────────────────
 * Ijodkor bir nechta tarmoqda ishlaydi va odam uni "boshqa joyda ham
 * bormi?" deb izlaydi. Ilgari buni faqat izohga yozish mumkin edi —
 * u yerda havola bosilmasdi va har postda takrorlanardi.
 *
 * ── Nima uchun manzil BAZADA saqlanmaydi ──────────────────────────────
 * Bazada faqat nom turadi, manzilni `ctaHref()` yasaydi. Ya'ni
 * begona domenga olib boradigan havolaning profilga tushishi mumkin
 * emas — chaqiruv (CTA) bilan aynan bir xil qoida.
 *
 * ── Nima uchun "hamkorlikka ochiq" ALOHIDA belgi ──────────────────────
 * Har kimga xabar yozish mumkin. Lekin biznes "bu odam reklama
 * qiladimi yoki shunchaki blog yuritadimi?" degan savolga javob
 * izlaydi va uni topa olmasa, umuman yozmaydi.
 */
export function CreatorLinks({ links, isOpenToCollab, collabNote }: CreatorLinksProps) {
  // Hech narsa yo'q bo'lsa, bo'sh sarlavha ham chizilmaydi.
  if (links.length === 0 && !isOpenToCollab) return null;

  /*
    Tartib RO'YXATDAN olinadi, javobdan emas.

    Server tartibi o'zgarsa, profildagi havolalar joyini
    almashtirib turardi — va bu buzuqlikka o'xshab ko'rinardi.
  */
  const ordered = CREATOR_LINK_KINDS.flatMap((kind) => links.filter((item) => item.kind === kind));

  return (
    <div className="mt-4 space-y-3">
      {ordered.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ordered.map((item) => {
            const config = creatorLinkConfig(item.kind);
            const Icon = config.icon;
            const href = ctaHref(item.kind, item.handle);

            if (!href) return null;

            return (
              <a
                key={item.kind}
                href={href}
                target="_blank"
                /*
                  `noopener` shart: usiz ochilgan sayt bizning
                  oynamizni boshqa manzilga yo'naltira olardi.
                */
                rel="noopener noreferrer nofollow"
                className="border-border hover:bg-secondary inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors"
              >
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="max-w-32 truncate">{`@${item.handle}`}</span>
              </a>
            );
          })}
        </div>
      )}

      {isOpenToCollab && (
        <div className="border-primary/30 bg-primary/5 flex items-start gap-2 rounded-xl border px-3 py-2.5">
          <Handshake className="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />

          <div className="min-w-0">
            <p className="text-sm font-medium">Hamkorlikka ochiq</p>

            {/*
              Shartlar bo'lsa KO'RSATILADI.

              "Hamkorlikka ochiq" degan yozuvning o'zi savol
              qoldiradi: qanday hamkorlik? Izoh esa vaqtni tejaydi —
              mos kelmaydigan taklif umuman yozilmaydi.
            */}
            {collabNote && (
              <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{collabNote}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

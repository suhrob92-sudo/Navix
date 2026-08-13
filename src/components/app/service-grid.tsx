'use client';

import { MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { ServiceIcon } from '@/components/app/service-icon';
import { ModuleStatus, getQuickServices, type AppModule } from '@/config/modules';
import { useDisabledModules } from '@/hooks/use-module-status';
import { cn } from '@/lib/utils';

/** Yopiq holatda nechta xizmat ko'rsatiladi (oxirgi katak "Ko'proq" uchun). */
const COLLAPSED_COUNT = 9;

/**
 * "Tezkor xizmatlar" to'ri — maketdagi rangli ikonkalar.
 *
 * Har qatorda 4 ta (kichik ekran) yoki 5 ta (kengroq) ikonka. Boshida
 * faqat asosiylari ko'rinadi, "Ko'proq" bosilganda qolgani ochiladi —
 * shunda bosh sahifa uzayib ketmaydi.
 */
export function ServiceGrid() {
  const [isExpanded, setIsExpanded] = useState(false);
  const disabled = useDisabledModules();

  const services = getQuickServices();
  const hasMore = services.length > COLLAPSED_COUNT;
  const visible = isExpanded || !hasMore ? services : services.slice(0, COLLAPSED_COUNT);

  return (
    <div className="grid grid-cols-4 gap-x-2 gap-y-5 sm:grid-cols-5">
      {visible.map((service) => (
        <ServiceTile
          key={service.id}
          service={service}
          closedReason={disabled.has(service.id) ? (disabled.get(service.id) ?? '') : null}
        />
      ))}

      {hasMore && !isExpanded && (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="group flex flex-col items-center gap-2"
        >
          <span className="bg-secondary text-muted-foreground group-active:scale-95 inline-flex size-14 items-center justify-center rounded-2xl transition-transform">
            <MoreHorizontal className="size-6" aria-hidden="true" />
          </span>
          <span className="text-center text-xs leading-tight font-medium">Ko&apos;proq</span>
        </button>
      )}
    </div>
  );
}

/**
 * ── Nima uchun yopilgan xizmat YASHIRILMAYDI ──────────────────────────
 * Kartochkani butunlay olib tashlash mumkin edi. Lekin odam har kuni
 * ishlatadigan xizmat kutilmaganda YO'QOLIB qolsa, u "ilova buzildi"
 * deb o'ylaydi va qo'llab-quvvatlashga yozadi.
 *
 * Shuning uchun xizmat o'rnida qoladi, lekin xira ko'rinadi va
 * bosilmaydi — "tez orada" holatidagi modullar bilan bir xil. Sabab
 * esa uzoq bosilganda chiqadigan izohda ko'rinadi.
 */
function ServiceTile({ service, closedReason }: { service: AppModule; closedReason: string | null }) {
  const isAvailable = service.status === ModuleStatus.LIVE && closedReason === null;

  const content = (
    <>
      <ServiceIcon
        icon={service.icon}
        color={service.color}
        className={cn('group-active:scale-95', !isAvailable && 'opacity-60')}
      />
      <span
        className={cn(
          'text-center text-xs leading-tight font-medium',
          !isAvailable && 'text-muted-foreground',
        )}
      >
        {service.name}
      </span>
    </>
  );

  // Modul hali tayyor bo'lmasa havola qilmaymiz — 404 sahifaga olib borardi.
  if (!isAvailable) {
    return (
      <div
        className="group flex cursor-default flex-col items-center gap-2"
        title={closedReason ? `${service.name}: ${closedReason || 'vaqtincha yopiq'}` : `${service.name} — tez orada`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link href={service.href} className="group flex flex-col items-center gap-2 rounded-xl">
      {content}
    </Link>
  );
}

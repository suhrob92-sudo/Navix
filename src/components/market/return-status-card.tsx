import { Badge } from '@/components/ui/badge';
import {
  RETURN_REASON_LABELS,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_VARIANTS,
} from '@/config/order-return';
import { formatUzDateTime } from '@/lib/date';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { ReturnRequestView } from '@/modules/market/return.types';

/**
 * Yuborilgan qaytarish so'rovi.
 *
 * ── Nima uchun so'rov EKRANDA qoladi ──────────────────────────────────
 * So'rov yuborilgach uni yashirish mumkin edi. Lekin o'shanda
 * xaridor "yubordimmi yoki yo'qmi" degan shubhada qolardi va
 * ikkinchi marta yuborishga urinardi.
 *
 * Ko'rinib turgan so'rov esa "kutilmoqda" degan aniq javob beradi.
 */

export interface ReturnStatusCardProps {
  request: ReturnRequestView;
  className?: string;
}

export function ReturnStatusCard({ request, className }: ReturnStatusCardProps) {
  return (
    <section className={cn('bg-card border-border rounded-2xl border p-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Qaytarish so&apos;rovi</h2>

        <Badge variant={RETURN_STATUS_VARIANTS[request.status]}>
          {RETURN_STATUS_LABELS[request.status]}
        </Badge>
      </div>

      <p className="text-muted-foreground mt-2 text-xs">
        {`${formatUzDateTime(request.createdAt, 'short')} · ${RETURN_REASON_LABELS[request.reason]}`}
      </p>

      <ul className="mt-3 space-y-1.5">
        {request.items.map((item) => (
          <li key={item.orderItemId} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0">
              <span className="tabular-nums">{`${item.quantity} × `}</span>
              {item.name}
              {item.variantLabel && (
                <span className="text-muted-foreground block text-xs">{item.variantLabel}</span>
              )}
            </span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {formatTiyin(item.unitPrice * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      {request.comment && (
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{request.comment}</p>
      )}

      <div className="border-border/60 mt-3 flex items-baseline justify-between border-t pt-3">
        <span className="text-sm font-medium">
          {request.status === 'APPROVED' ? 'Qaytarildi' : 'Qaytariladi'}
        </span>
        <span className="text-base font-semibold tabular-nums">{formatTiyin(request.amount)}</span>
      </div>

      {request.includesDeliveryFee && (
        <p className="text-muted-foreground mt-1 text-xs">Yetkazish haqi ham kiritilgan.</p>
      )}

      {/*
        Sotuvchining javobi — ayniqsa RAD ETILGANDA muhim.

        Sababsiz rad etish xaridorni javobsiz qoldirardi: u nima
        qilish kerakligini ham, kim bilan gaplashishni ham
        bilmasdi.
      */}
      {request.decisionNote && (
        <div
          className={cn(
            'mt-3 rounded-xl p-3 text-xs leading-relaxed',
            request.status === 'REJECTED'
              ? 'bg-destructive/10 text-destructive'
              : 'bg-secondary/60 text-muted-foreground',
          )}
        >
          <span className="font-medium">Sotuvchi javobi: </span>
          {request.decisionNote}
        </div>
      )}
    </section>
  );
}

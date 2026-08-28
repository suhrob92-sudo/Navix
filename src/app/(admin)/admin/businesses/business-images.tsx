'use client';

import { BedDouble } from 'lucide-react';

import { CatalogImagePanel } from '@/components/catalog/catalog-image-panel';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { type CatalogImageOwner } from '@/config/catalog-image';
import { useApiQuery } from '@/hooks/use-api';
import type { BusinessKind } from '@/modules/admin/business.service';

/**
 * Biznes rasmlarini XODIM boshqaradi.
 *
 * ── Nima uchun bu ekran kerak bo'ldi ──────────────────────────────────
 * Rasm tizimi yettita tur bilan ishlaydi (mahsulot, taom, mehmonxona,
 * xona, restoran, do'kon, kompaniya) va serverda hammasi tayyor edi.
 * Lekin EKRAN faqat ikkitasiga bor edi: mahsulot va taom.
 *
 * Natijada mehmonxonalarga rasm qo'yish umuman IMKONSIZ edi — ilova
 * ichida bunday tugma yo'q edi. Katalogdagi mehmonxonalar esa
 * rasmsiz turardi va bu "ma'lumot yetishmaydi" emas, "yo'l yo'q"
 * degani edi.
 *
 * ── Nima uchun XODIM, biznes egasi emas ───────────────────────────────
 * Mehmonxonaning "egasi" tushunchasi hali yo'q: `hotels` jadvalida
 * `ownerId` ustuni ham yo'q. Ular platforma tomonidan qo'shiladi.
 *
 * Shuning uchun ruxsat ham server tomonda shunday qo'yilgan
 * (`catalog-image.service.ts`): mehmonxona va xona rasmlarini FAQAT
 * admin o'zgartira oladi. Bu ekran o'sha qoidaga mos keladi.
 *
 * Do'kon va restoran rasmlarini esa egasi ham qo'ya oladi — bu ekran
 * unga xalaqit bermaydi, faqat xodimga ham imkon beradi (masalan
 * egasi biriktirilmagan bo'lsa).
 */

interface HotelRoomsResponse {
  hotel: {
    rooms: { id: string; name: string }[];
  };
}

/** Biznes turi -> rasm turi. */
const OWNER_BY_KIND: Record<BusinessKind, CatalogImageOwner> = {
  SHOP: 'SHOP',
  RESTAURANT: 'RESTAURANT',
  HOTEL: 'HOTEL',
};

/**
 * Mehmonxona XONALARI ham alohida rasmga muhtoj.
 *
 * Mijoz mehmonxonani emas, XONANI tanlaydi: narx, sig'im va ko'rinish
 * o'sha yerda. Faqat umumiy rasm bo'lsa, "lyuks" bilan "standart"
 * o'rtasidagi farq ko'rinmasdi.
 */
function HotelRooms({ slug }: { slug: string }) {
  const { data, isLoading, error } = useApiQuery<HotelRoomsResponse>(`/api/v1/hotels/${slug}`);

  const rooms = data?.hotel.rooms ?? [];

  return (
    <div className="border-border/60 space-y-4 border-t pt-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <BedDouble className="size-4" aria-hidden="true" />
        Xonalar
      </p>

      {isLoading && <Skeleton className="h-24 rounded-2xl" />}

      {!isLoading && error && (
        <Alert variant="error" title="Xonalarni yuklab bo'lmadi">
          {error}
        </Alert>
      )}

      {!isLoading && !error && rooms.length === 0 && (
        <p className="text-muted-foreground text-xs">
          Faol xona yo&apos;q. Yopiq xona bu ro&apos;yxatda ko&apos;rinmaydi.
        </p>
      )}

      {rooms.map((room) => (
        <CatalogImagePanel key={room.id} owner="HOTEL_ROOM" ownerId={room.id} title={room.name} showHint={false} />
      ))}
    </div>
  );
}

export interface BusinessImagesProps {
  kind: BusinessKind;
  id: string;
  slug: string;
}

export function BusinessImages({ kind, id, slug }: BusinessImagesProps) {
  return (
    <div className="border-border/60 mt-3 space-y-4 border-t pt-3">
      <p className="text-muted-foreground text-xs">
        Birinchi rasm ro&apos;yxatlarda va qidiruvda ko&apos;rinadi. Tartibni o&apos;q
        tugmalari bilan o&apos;zgartiring.
      </p>

      <CatalogImagePanel
        owner={OWNER_BY_KIND[kind]}
        ownerId={id}
        title="Asosiy rasmlar"
        showHint={false}
      />

      {kind === 'HOTEL' && <HotelRooms slug={slug} />}
    </div>
  );
}

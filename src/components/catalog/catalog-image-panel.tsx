'use client';

import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { CatalogImageManager } from '@/components/catalog/catalog-image-manager';
import { catalogImagesPath, type CatalogImageOwner } from '@/config/catalog-image';
import { useApiQuery } from '@/hooks/use-api';
import type { CatalogImagesResponse } from '@/modules/catalog/catalog-image.types';

/**
 * Bitta obyektning rasmlarini yuklaydi va boshqaruvchini ko'rsatadi.
 *
 * ── Nima uchun alohida komponent ──────────────────────────────────────
 * `CatalogImageManager` ro'yxatni O'ZI yuklamaydi: unga tayyor ro'yxat
 * beriladi. Mahsulot va taom ekranlarida bu qulay — ular obyektni
 * baribir yuklaydi va rasmlar o'sha javobda keladi.
 *
 * Do'kon, restoran va mehmonxona ekranlarida esa unday emas: u yerda
 * ro'yxatdagi har bir biznes uchun rasmlar ALOHIDA so'raladi. Har bir
 * ekran buni o'zicha yozsa, "yuklanmoqda", "xato" va "yangilash"
 * mantig'i uch marta takrorlanardi.
 *
 * ── Nima uchun alohida holat (state) yo'q ─────────────────────────────
 * Ro'yxat `setData` bilan javobning o'zida yangilanadi. Aks holda
 * "yuklandi -> holatga ko'chir" degan effekt kerak bo'lardi va u
 * ekranni ikki marta chizardi (loyihada bunday effekt taqiqlangan).
 */
export interface CatalogImagePanelProps {
  owner: CatalogImageOwner;
  ownerId: string;
  /** Boshqaruvchi ustidagi sarlavha. Bo'sh qoldirilsa — "Rasmlar". */
  title?: string;
  /** Pastdagi izoh chiqsinmi (bir nechta panel yonma-yon tursa — yo'q). */
  showHint?: boolean;
}

export function CatalogImagePanel({ owner, ownerId, title, showHint }: CatalogImagePanelProps) {
  const { data, isLoading, error, setData } = useApiQuery<CatalogImagesResponse>(
    catalogImagesPath(owner, ownerId),
  );

  if (isLoading) return <Skeleton className="h-24 rounded-2xl" />;

  if (error) {
    return (
      <Alert variant="error" title="Rasmlarni yuklab bo'lmadi">
        {error}
      </Alert>
    );
  }

  return (
    <CatalogImageManager
      owner={owner}
      ownerId={ownerId}
      images={data?.images ?? []}
      onChange={(images) => setData({ images })}
      title={title}
      showHint={showHint}
    />
  );
}

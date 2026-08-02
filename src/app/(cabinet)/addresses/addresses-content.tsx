'use client';

import { Briefcase, House, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { AddressForm } from '@/app/(cabinet)/addresses/address-form';
import { PageHeader } from '@/components/shared/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient, useApiQuery } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatAddressLine } from '@/modules/address/address.schemas';

export interface AddressItem {
  id: string;
  type: string;
  label: string;
  country: string;
  city: string;
  district: string | null;
  street: string;
  building: string | null;
  apartment: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  notes: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AddressesResponse {
  addresses: AddressItem[];
}

/** Manzil turiga mos ikonka. */
const TYPE_ICONS = {
  HOME: House,
  WORK: Briefcase,
  OTHER: MapPin,
} as const;

/** Manzillar sahifasi. */
export function AddressesContent() {
  const request = useApiClient();
  const { data, isLoading, error, reload } = useApiQuery<AddressesResponse>('/api/v1/addresses');

  const [editing, setEditing] = useState<AddressItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AddressItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const addresses = data?.addresses ?? [];

  function openCreateForm() {
    setEditing(null);
    setIsFormOpen(true);
    setActionError(null);
  }

  function openEditForm(address: AddressItem) {
    setEditing(address);
    setIsFormOpen(true);
    setActionError(null);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditing(null);
  }

  function handleSaved() {
    closeForm();
    reload();
  }

  /** Manzilni standart qilib belgilaydi. */
  async function makeDefault(address: AddressItem) {
    setActionError(null);

    try {
      await request(`/api/v1/addresses/${address.id}`, { method: 'PATCH', body: { isDefault: true } });
      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setActionError(null);

    try {
      await request(`/api/v1/addresses/${deleteTarget.id}`, { method: 'DELETE' });
      setDeleteTarget(null);
      reload();
    } catch (caught) {
      setActionError(toUserMessage(caught));
    } finally {
      setIsDeleting(false);
    }
  }

  // --- Forma rejimi ---
  if (isFormOpen) {
    return (
      <>
        <PageHeader
          title={editing ? 'Manzilni tahrirlash' : "Yangi manzil qo'shish"}
          description="Bu manzil taksi, ovqat yetkazish va kuryer xizmatlarida ishlatiladi."
        />

        <Card variant="glass" className="animate-fade-up">
          <AddressForm address={editing} onSaved={handleSaved} onCancel={closeForm} />
        </Card>
      </>
    );
  }

  // --- Ro'yxat rejimi ---
  return (
    <>
      <PageHeader
        title="Manzillarim"
        description="Saqlangan manzillar buyurtma berishda bir bosishda tanlanadi."
        action={
          <Button onClick={openCreateForm}>
            <Plus aria-hidden="true" />
            Qo&apos;shish
          </Button>
        }
      />

      {actionError && (
        <Alert variant="error" className="mb-4">
          {actionError}
        </Alert>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <Alert variant="error" title="Manzillarni yuklab bo'lmadi">
          {error}
        </Alert>
      )}

      {!isLoading && !error && addresses.length === 0 && (
        <Card variant="glass" padding="none" className="animate-fade-up">
          <EmptyState
            icon={MapPin}
            title="Hali manzil qo'shilmagan"
            description="Birinchi manzilingizni qo'shing — keyin taksi chaqirish yoki ovqat buyurtma qilish bir necha soniya vaqt oladi."
            action={
              <Button onClick={openCreateForm}>
                <Plus aria-hidden="true" />
                Manzil qo&apos;shish
              </Button>
            }
          />
        </Card>
      )}

      {!isLoading && !error && addresses.length > 0 && (
        <ul className="space-y-3">
          {addresses.map((address, index) => {
            const Icon = TYPE_ICONS[address.type as keyof typeof TYPE_ICONS] ?? MapPin;

            return (
              <li key={address.id}>
                <Card
                  variant="glass"
                  padding="sm"
                  className="animate-fade-up"
                  style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="bg-secondary text-muted-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
                      <Icon className="size-4.5" aria-hidden="true" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{address.label}</CardTitle>
                        {address.isDefault && (
                          <Badge variant="success">
                            <Star className="size-3" aria-hidden="true" />
                            Standart
                          </Badge>
                        )}
                      </div>

                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                        {formatAddressLine(address)}
                      </p>

                      {address.notes && (
                        <p className="text-muted-foreground mt-1 text-xs italic">{address.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="border-border/60 mt-3 flex flex-wrap gap-1 border-t pt-3">
                    {!address.isDefault && (
                      <Button variant="ghost" size="sm" onClick={() => makeDefault(address)}>
                        <Star aria-hidden="true" />
                        Standart qilish
                      </Button>
                    )}

                    <Button variant="ghost" size="sm" onClick={() => openEditForm(address)}>
                      <Pencil aria-hidden="true" />
                      Tahrirlash
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTarget(address)}
                    >
                      <Trash2 aria-hidden="true" />
                      O&apos;chirish
                    </Button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Manzilni o'chirasizmi?"
        description={
          deleteTarget
            ? `"${deleteTarget.label}" manzili o'chiriladi. Eski buyurtmalaringizda u ko'rinib turaveradi.`
            : ''
        }
        confirmLabel="O'chirish"
        isDestructive
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

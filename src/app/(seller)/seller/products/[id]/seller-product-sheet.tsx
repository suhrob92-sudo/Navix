'use client';

import { useState } from 'react';

import { CatalogImageManager } from '@/components/catalog/catalog-image-manager';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useApiClient } from '@/hooks/use-api';
import { ApiClientError, toUserMessage } from '@/lib/api-client';
import type { FieldErrors } from '@/lib/api/errors';
import type { CatalogImageView } from '@/modules/catalog/catalog-image.types';
import type { SellerCategoryOption, SellerProduct } from '@/modules/seller/seller.types';

/**
 * Mahsulot formasi — YANGI qo'shish va TAHRIRLASH uchun bitta oyna.
 *
 * ── Nima uchun bitta komponent ────────────────────────────────────────
 * Ikkala holatda ham bir xil maydonlar to'ldiriladi va bir xil qoidalar
 * tekshiriladi. Ikkita alohida forma yozilsa, ertaga yangi maydon
 * qo'shilganda bittasida unutilardi va sotuvchi buni faqat xato
 * chiqqanda bilardi.
 *
 * Farq faqat ikkitasi: toifa yaratishda tanlanadi (keyin o'zgarmaydi,
 * chunki katalogdagi joyini o'zgartirish — alohida qaror) va "sotuvda"
 * kaliti faqat tahrirlashda ko'rinadi.
 */

export interface SellerProductSheetProps {
  shopId: string;
  categories: readonly SellerCategoryOption[];
  /** Berilsa — tahrirlash, berilmasa — yangi mahsulot. */
  product?: SellerProduct;
  onSaved: (product: SellerProduct) => void;
  /**
   * Rasmlar o'zgarganda chaqiriladi.
   *
   * ── Nima uchun `onSaved` dan ALOHIDA ────────────────────────────────
   * `onSaved` oynani yopadi, chunki forma saqlangandan keyin uni ochiq
   * qoldirishning ma'nosi yo'q.
   *
   * Rasm esa boshqacha: sotuvchi odatda 3-4 rasmni ketma-ket qo'shadi
   * va har safar oyna yopilsa, uni qaytadan ochish kerak bo'lardi.
   */
  onImagesChanged?: (images: CatalogImageView[]) => void;
  onClose: () => void;
}

interface FormState {
  name: string;
  categoryId: string;
  priceSom: string;
  oldPriceSom: string;
  stock: string;
  description: string;
  isActive: boolean;
}

/** Tiyindagi summani forma uchun so'mga aylantiradi. */
function toSomInput(tiyin: number | null): string {
  return tiyin === null ? '' : String(Math.round(tiyin / 100));
}

function buildInitialState(
  product: SellerProduct | undefined,
  categories: readonly SellerCategoryOption[],
): FormState {
  if (!product) {
    return {
      name: '',
      categoryId: categories[0]?.id ?? '',
      priceSom: '',
      oldPriceSom: '',
      stock: '',
      description: '',
      isActive: true,
    };
  }

  return {
    name: product.name,
    categoryId: product.categoryId,
    priceSom: toSomInput(product.price),
    oldPriceSom: toSomInput(product.oldPrice),
    stock: String(product.stock),
    description: product.description ?? '',
    isActive: product.isActive,
  };
}

/**
 * Raqamli maydonni songa aylantiradi.
 *
 * Bo'sh yoki noto'g'ri matn `null` qaytaradi — bunday maydon so'rovga
 * umuman qo'shilmaydi va server "kiriting" deb aytadi. Ya'ni brauzer
 * "0" deb taxmin qilib, xato ma'lumot yubormaydi.
 */
function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const parsed = Number(trimmed);

  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

export function SellerProductSheet({
  shopId,
  categories,
  product,
  onSaved,
  onImagesChanged,
  onClose,
}: SellerProductSheetProps) {
  const isEditing = product !== undefined;
  const request = useApiClient();

  const [form, setForm] = useState<FormState>(() => buildInitialState(product, categories));
  /**
   * Rasmlar formadan TASHQARIDA saqlanadi.
   *
   * Ular "Saqlash" tugmasini kutmaydi: rasm qo'shilishi bilan
   * serverga yoziladi. Aks holda sotuvchi rasm qo'shib, oynani
   * yopsa — rasm yo'qolardi.
   */
  const [images, setImages] = useState<CatalogImageView[]>(product?.images ?? []);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function update<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    setIsSaving(true);
    setFormError(null);
    setFieldErrors({});

    const priceSom = toNumber(form.priceSom);
    const stock = toNumber(form.stock);
    const oldPriceSom = toNumber(form.oldPriceSom);
    const description = form.description.trim();

    /**
     * Tahrirlashda `null` — "chegirmani olib tashla", `undefined` —
     * "tegmadim". Yaratishda esa bo'sh maydon shunchaki yuborilmaydi.
     */
    const body = isEditing
      ? {
          name: form.name.trim(),
          description: description === '' ? null : description,
          ...(priceSom === null ? {} : { priceSom }),
          oldPriceSom,
          ...(stock === null ? {} : { stock }),
          isActive: form.isActive,
        }
      : {
          name: form.name.trim(),
          categoryId: form.categoryId,
          ...(description === '' ? {} : { description }),
          ...(priceSom === null ? {} : { priceSom }),
          ...(oldPriceSom === null ? {} : { oldPriceSom }),
          ...(stock === null ? {} : { stock }),
        };

    try {
      const response = await request<{ product: SellerProduct }>(
        isEditing ? `/api/v1/seller/products/${product.id}` : `/api/v1/seller/shops/${shopId}/products`,
        { method: isEditing ? 'PATCH' : 'POST', body },
      );

      onSaved(response.product);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.details) {
        setFieldErrors(caught.details);
      }

      setFormError(toUserMessage(caught));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="bg-card animate-scale-in max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl p-6">
        <h2 className="text-lg font-semibold tracking-tight">
          {isEditing ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
        </h2>

        <form onSubmit={submit} className="mt-4 space-y-4">
          {formError && <Alert variant="error">{formError}</Alert>}

          <Field id="product-name" label="Nomi" required errors={fieldErrors.name}>
            <Input
              id="product-name"
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              placeholder="Masalan: Redmi Note 14 6/128GB"
              hasError={Boolean(fieldErrors.name)}
              disabled={isSaving}
            />
          </Field>

          {!isEditing && (
            <Field
              id="product-category"
              label="Toifa"
              required
              hint="Xaridor mahsulotni shu bo'limdan topadi"
              errors={fieldErrors.categoryId}
            >
              <Select
                id="product-category"
                value={form.categoryId}
                onChange={(event) => update('categoryId', event.target.value)}
                options={categories.map((category) => ({ value: category.id, label: category.name }))}
                hasError={Boolean(fieldErrors.categoryId)}
                disabled={isSaving}
              />
            </Field>
          )}

          <Field id="product-price" label="Narx (so'm)" required errors={fieldErrors.priceSom}>
            <Input
              id="product-price"
              type="number"
              inputMode="numeric"
              value={form.priceSom}
              onChange={(event) => update('priceSom', event.target.value)}
              placeholder="2690000"
              hasError={Boolean(fieldErrors.priceSom)}
              disabled={isSaving}
            />
          </Field>

          <Field
            id="product-old-price"
            label="Eski narx (so'm)"
            hint="Chegirma ko'rsatish uchun. Bo'sh qoldirsangiz chegirma ko'rinmaydi."
            errors={fieldErrors.oldPriceSom}
          >
            <Input
              id="product-old-price"
              type="number"
              inputMode="numeric"
              value={form.oldPriceSom}
              onChange={(event) => update('oldPriceSom', event.target.value)}
              placeholder="2990000"
              hasError={Boolean(fieldErrors.oldPriceSom)}
              disabled={isSaving}
            />
          </Field>

          <Field
            id="product-stock"
            label="Omborda (dona)"
            required
            hint="Tugaganda 0 yozing — mahsulot sotuvda qoladi, lekin buyurtma qabul qilinmaydi"
            errors={fieldErrors.stock}
          >
            <Input
              id="product-stock"
              type="number"
              inputMode="numeric"
              value={form.stock}
              onChange={(event) => update('stock', event.target.value)}
              placeholder="10"
              hasError={Boolean(fieldErrors.stock)}
              disabled={isSaving}
            />
          </Field>

          <Field id="product-description" label="Tavsif" errors={fieldErrors.description}>
            <Input
              id="product-description"
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="Qisqacha ma'lumot"
              hasError={Boolean(fieldErrors.description)}
              disabled={isSaving}
            />
          </Field>

          {/*
            Rasmlar faqat TAHRIRLASHDA ko'rinadi.

            Yangi mahsulotda uning ID'si hali yo'q, ya'ni rasmni
            biriktiradigan joy yo'q. Sotuvchi avval mahsulotni
            saqlaydi, keyin rasm qo'shadi — bu ketma-ketlik
            barcha savdo maydonchalarida bir xil.
          */}
          {isEditing && (
            <div className="border-border/60 border-t pt-4">
              <CatalogImageManager
                owner="PRODUCT"
                ownerId={product.id}
                images={images}
                onChange={(next) => {
                  setImages(next);
                  onImagesChanged?.(next);
                }}
              />
            </div>
          )}

          {isEditing && (
            <div className="border-border/60 border-t pt-4">
              <Switch
                checked={form.isActive}
                onCheckedChange={(value) => update('isActive', value)}
                disabled={isSaving}
                label={form.isActive ? 'Sotuvda' : 'Sotuvdan olingan'}
                description={
                  form.isActive
                    ? "Mahsulot katalogda va qidiruvda ko'rinadi"
                    : "Mahsulot katalogdan yashiriladi, eski buyurtmalar o'zgarmaydi"
                }
              />
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Bekor qilish
            </Button>
            <Button type="submit" isLoading={isSaving} loadingText="Saqlanmoqda...">
              Saqlash
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

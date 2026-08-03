'use client';

import { Check, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { SERVICE_CATEGORIES } from '@/config/service-providers';
import { useApiClient } from '@/hooks/use-api';
import { ApiClientError, toUserMessage } from '@/lib/api-client';
import { formatAmountInput, parseAmountInput } from '@/lib/money';
import { cn } from '@/lib/utils';
import type { FieldErrors } from '@/lib/api/errors';
import { validateAccountRegex } from '@/modules/admin/account-regex';
import { createProviderSchema } from '@/modules/admin/admin.schemas';
import type { AdminProviderItem, AdminProviderResponse } from '@/modules/admin/admin.types';

/**
 * Xizmat provayderini qo'shish va tahrirlash formasi.
 *
 * ── Eng nozik maydon: hisob raqami naqshi ─────────────────────────────
 * Naqsh (regex) — dasturchi tushunchasi, admin esa dasturchi emas.
 * Shuning uchun uch xil yordam berilgan:
 *  1. Tayyor namunalar (tugma bosiladi, naqsh o'zi yoziladi);
 *  2. Sinov maydoni — namunaviy raqam kiritiladi va darhol
 *     "mos keladi / kelmaydi" ko'rinadi;
 *  3. Xavfsizlik tekshiruvi — xavfli naqshni yozib bo'lmaydi.
 */

const CATEGORY_OPTIONS = SERVICE_CATEGORIES.map((category) => ({
  value: category.value,
  label: category.label,
}));

const COLOR_OPTIONS = [
  { value: 'orange', label: "To'q sariq" },
  { value: 'blue', label: "Ko'k" },
  { value: 'amber', label: 'Sariq' },
  { value: 'green', label: 'Yashil' },
  { value: 'teal', label: "Ko'k-yashil" },
  { value: 'sky', label: 'Osmon rangi' },
  { value: 'indigo', label: 'Siyoh rang' },
  { value: 'violet', label: 'Binafsha' },
  { value: 'rose', label: 'Pushti-qizil' },
  { value: 'pink', label: 'Pushti' },
  { value: 'slate', label: 'Kulrang' },
] as const;

/** Tayyor naqsh namunalari — eng ko'p uchraydigan holatlar. */
const REGEX_PRESETS = [
  { label: '10 ta raqam', value: '^\\d{10}$', hint: '1234567890' },
  { label: '12 ta raqam', value: '^\\d{12}$', hint: '123456789012' },
  { label: 'Telefon (9 ta raqam)', value: '^\\d{9}$', hint: '901234567' },
  { label: 'Harf va raqam', value: '^[A-Z0-9]{6,12}$', hint: 'AB123456' },
] as const;

export interface ProviderFormProps {
  /** Tahrirlanayotgan xizmat. `null` — yangisi qo'shilmoqda. */
  provider: AdminProviderItem | null;
  onSaved: (provider: AdminProviderItem) => void;
  onCancel: () => void;
}

export function ProviderForm({ provider, onSaved, onCancel }: ProviderFormProps) {
  const request = useApiClient();
  const isEditing = provider !== null;

  const [code, setCode] = useState(provider?.code ?? '');
  const [name, setName] = useState(provider?.name ?? '');
  const [category, setCategory] = useState<string>(provider?.category ?? 'UTILITY');
  const [description, setDescription] = useState(provider?.description ?? '');
  const [accountLabel, setAccountLabel] = useState(provider?.accountLabel ?? 'Shaxsiy hisob raqami');
  const [accountHint, setAccountHint] = useState(provider?.accountHint ?? '');
  const [accountRegex, setAccountRegex] = useState(provider?.accountRegex ?? '^\\d{10}$');
  const [minAmount, setMinAmount] = useState(formatAmountInput(provider?.minAmountSom ?? 1_000));
  const [maxAmount, setMaxAmount] = useState(formatAmountInput(provider?.maxAmountSom ?? 10_000_000));
  const [color, setColor] = useState<string>(provider?.color ?? 'blue');
  const [sortOrder, setSortOrder] = useState(String(provider?.sortOrder ?? 100));
  const [isActive, setIsActive] = useState(provider?.isActive ?? true);

  /** Naqshni tekshirish uchun namunaviy raqam. */
  const [sampleAccount, setSampleAccount] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const regexProblems = validateAccountRegex(accountRegex);
  const sampleResult = testSample(accountRegex, sampleAccount, regexProblems.length === 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const payload = {
      code: code.trim().toLowerCase(),
      name,
      category,
      description: description.trim() || null,
      accountLabel,
      accountHint,
      accountRegex: accountRegex.trim(),
      minAmountSom: parseAmountInput(minAmount) ?? 0,
      maxAmountSom: parseAmountInput(maxAmount) ?? 0,
      color,
      sortOrder: Number(sortOrder) || 100,
      isActive,
    };

    // Serverdagi sxemaning AYNAN O'ZI bilan tekshiramiz — shunda
    // foydalanuvchi bir xil xabarni ko'radi va tarmoqqa bekorga
    // so'rov ketmaydi.
    const parsed = createProviderSchema.safeParse(payload);

    if (!parsed.success) {
      const errors: FieldErrors = {};

      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || '_root';
        errors[key] = [...(errors[key] ?? []), issue.message];
      }

      setFieldErrors(errors);
      setFormError("Ba'zi maydonlar to'g'ri to'ldirilmagan");
      return;
    }

    setIsSaving(true);

    try {
      // Tahrirlashda `code` yuborilmaydi — u o'zgarmas.
      const { code: _code, ...updateFields } = parsed.data;

      const response = await request<AdminProviderResponse>(
        isEditing ? `/api/v1/admin/providers/${provider.id}` : '/api/v1/admin/providers',
        {
          method: isEditing ? 'PATCH' : 'POST',
          body: isEditing ? updateFields : parsed.data,
        },
      );

      onSaved(response.provider);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.details) {
        setFieldErrors(caught.details);
      }

      setFormError(toUserMessage(caught));
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {formError && <Alert variant="error">{formError}</Alert>}

      <Field
        id="name"
        label="Xizmat nomi"
        required
        hint="Foydalanuvchi ro'yxatda shu nomni ko'radi"
        errors={fieldErrors.name}
      >
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Hududgaz"
          hasError={Boolean(fieldErrors.name)}
          disabled={isSaving}
        />
      </Field>

      <Field
        id="code"
        label="Kod"
        required={!isEditing}
        hint={
          isEditing
            ? "Kod o'zgartirilmaydi: u to'lovlar tarixi bilan bog'langan"
            : 'Faqat kichik harf va chiziqcha: hududgaz, hududiy-elektr'
        }
        errors={fieldErrors.code}
      >
        <Input
          id="code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="hududgaz"
          hasError={Boolean(fieldErrors.code)}
          disabled={isSaving || isEditing}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="category" label="Toifa" required errors={fieldErrors.category}>
          <Select
            id="category"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={isSaving}
          />
        </Field>

        <Field id="color" label="Rang" required errors={fieldErrors.color}>
          <Select
            id="color"
            options={COLOR_OPTIONS}
            value={color}
            onChange={(event) => setColor(event.target.value)}
            disabled={isSaving}
          />
        </Field>
      </div>

      <Field id="description" label="Qisqa izoh" errors={fieldErrors.description}>
        <Input
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Tabiiy gaz uchun to'lov"
          hasError={Boolean(fieldErrors.description)}
          disabled={isSaving}
        />
      </Field>

      {/* Hisob raqami sozlamalari */}
      <fieldset className="border-border/60 space-y-5 rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Hisob raqami</legend>

        <Field
          id="accountLabel"
          label="Maydon nomi"
          required
          hint="To'lov sahifasida shu yozuv chiqadi"
          errors={fieldErrors.accountLabel}
        >
          <Input
            id="accountLabel"
            value={accountLabel}
            onChange={(event) => setAccountLabel(event.target.value)}
            placeholder="Shaxsiy hisob raqami"
            hasError={Boolean(fieldErrors.accountLabel)}
            disabled={isSaving}
          />
        </Field>

        <Field
          id="accountHint"
          label="Namuna"
          required
          hint="Foydalanuvchiga ko'rsatiladigan misol"
          errors={fieldErrors.accountHint}
        >
          <Input
            id="accountHint"
            value={accountHint}
            onChange={(event) => setAccountHint(event.target.value)}
            placeholder="1234567890"
            hasError={Boolean(fieldErrors.accountHint)}
            disabled={isSaving}
          />
        </Field>

        {/* Tayyor namunalar — naqshni qo'lda yozmaslik uchun */}
        <div>
          <p className="mb-2 text-sm font-medium">Tayyor qolip</p>
          <div className="flex flex-wrap gap-2">
            {REGEX_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setAccountRegex(preset.value);
                  setSampleAccount(preset.hint);
                  if (!accountHint) setAccountHint(preset.hint);
                }}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  accountRegex === preset.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:bg-secondary',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <Field
          id="accountRegex"
          label="Tekshirish naqshi"
          required
          hint="Xavfsizlik uchun qavs ishlatib bo'lmaydi"
          errors={fieldErrors.accountRegex ?? (regexProblems.length > 0 ? regexProblems : undefined)}
        >
          <Input
            id="accountRegex"
            value={accountRegex}
            onChange={(event) => setAccountRegex(event.target.value)}
            placeholder="^\d{10}$"
            spellCheck={false}
            autoCapitalize="none"
            className="font-mono text-sm"
            hasError={regexProblems.length > 0 || Boolean(fieldErrors.accountRegex)}
            disabled={isSaving}
          />
        </Field>

        {/* Jonli sinov — saqlashdan oldin tekshirib ko'rish */}
        <Field id="sampleAccount" label="Sinab ko'ring" hint="Haqiqiy hisob raqamini kiriting va natijani ko'ring">
          <Input
            id="sampleAccount"
            value={sampleAccount}
            onChange={(event) => setSampleAccount(event.target.value)}
            placeholder="1234567890"
            inputMode="text"
            autoCapitalize="none"
            disabled={isSaving}
            trailing={
              sampleResult === null ? undefined : (
                <span
                  className={cn(
                    'mr-2 inline-flex size-7 items-center justify-center rounded-full',
                    sampleResult ? 'bg-success/15 text-success' : 'bg-destructive/12 text-destructive',
                  )}
                  aria-label={sampleResult ? 'Mos keladi' : 'Mos kelmaydi'}
                >
                  {sampleResult ? <Check className="size-4" /> : <X className="size-4" />}
                </span>
              )
            }
          />
        </Field>
      </fieldset>

      {/* To'lov chegaralari */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="minAmount" label="Eng kam summa" required errors={fieldErrors.minAmountSom}>
          <Input
            id="minAmount"
            inputMode="numeric"
            value={minAmount}
            onChange={(event) => setMinAmount(formatOnType(event.target.value))}
            hasError={Boolean(fieldErrors.minAmountSom)}
            disabled={isSaving}
            trailing={<span className="text-muted-foreground mr-3 text-sm">so&apos;m</span>}
          />
        </Field>

        <Field id="maxAmount" label="Eng ko'p summa" required errors={fieldErrors.maxAmountSom}>
          <Input
            id="maxAmount"
            inputMode="numeric"
            value={maxAmount}
            onChange={(event) => setMaxAmount(formatOnType(event.target.value))}
            hasError={Boolean(fieldErrors.maxAmountSom)}
            disabled={isSaving}
            trailing={<span className="text-muted-foreground mr-3 text-sm">so&apos;m</span>}
          />
        </Field>
      </div>

      <Field
        id="sortOrder"
        label="Tartib raqami"
        hint="Kichik son ro'yxatda yuqoriroq turadi"
        errors={fieldErrors.sortOrder}
      >
        <Input
          id="sortOrder"
          inputMode="numeric"
          value={sortOrder}
          onChange={(event) => setSortOrder(event.target.value.replace(/\D/g, '').slice(0, 4))}
          hasError={Boolean(fieldErrors.sortOrder)}
          disabled={isSaving}
        />
      </Field>

      <div className="border-border/60 border-t pt-5">
        <Switch
          checked={isActive}
          onCheckedChange={setIsActive}
          disabled={isSaving}
          label="Faol"
          description="O'chirilsa foydalanuvchilar ro'yxatida ko'rinmaydi, lekin tarix saqlanadi"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Bekor qilish
        </Button>
        <Button type="submit" isLoading={isSaving} loadingText="Saqlanmoqda...">
          {isEditing ? "O'zgarishlarni saqlash" : "Xizmat qo'shish"}
        </Button>
      </div>
    </form>
  );
}

/** Summa maydonida yozayotganda uch xonadan ajratib ko'rsatadi. */
function formatOnType(raw: string): string {
  const parsed = parseAmountInput(raw);
  return parsed === null ? '' : formatAmountInput(parsed);
}

/**
 * Namunaviy raqam naqshga mos keladimi.
 *
 * `null` — hali sinab ko'rilmagan yoki naqsh xato.
 *
 * MUHIM: naqsh xavfsizlik tekshiruvidan o'tmaguncha `new RegExp`
 * chaqirilmaydi. Aks holda admin o'zining brauzerini muzlatib qo'yardi.
 */
function testSample(source: string, sample: string, isSafe: boolean): boolean | null {
  if (!isSafe || sample === '') return null;

  try {
    return new RegExp(source).test(sample);
  } catch {
    return null;
  }
}

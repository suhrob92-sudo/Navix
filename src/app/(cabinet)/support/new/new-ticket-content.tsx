'use client';

import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useApiClient } from '@/hooks/use-api';
import { ApiClientError, toUserMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { RequireAuth } from '@/modules/auth/require-auth';
import { createTicketSchema } from '@/modules/support/support.schemas';
import { SUPPORT_CATEGORIES, type SupportCategoryName } from '@/modules/support/support.types';
import type { FieldErrors } from '@/lib/api/errors';

/**
 * Yangi murojaat formasi.
 *
 * ── Nima uchun MAVZU TURI birinchi so'raladi ──────────────────────────
 * Xodim murojaatni ochmasdan turib nima haqida ekanini bilishi kerak:
 * to'lov masalasi bilan ilova xatosi bir xil shoshilinch emas va
 * ularni har xil odam ko'radi.
 *
 * Tur tugmalar ko'rinishida: ro'yxatdan tanlash telefonda ikki bosish,
 * tugmalar esa bitta.
 */
export function NewTicketContent() {
  return (
    <RequireAuth>
      <NewTicketBody />
    </RequireAuth>
  );
}

function NewTicketBody() {
  const router = useRouter();
  const request = useApiClient();

  const [category, setCategory] = useState<SupportCategoryName | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    /**
     * Tekshiruv AVVAL brauzerda bajariladi.
     *
     * Server baribir qayta tekshiradi (u yagona ishonchli joy), lekin
     * shu yerdagi tekshiruv odamga darhol javob beradi — sekin
     * internetda bu bir necha soniya farq qiladi.
     */
    const parsed = createTicketSchema.safeParse({ category, subject, message });

    if (!parsed.success) {
      const errors: FieldErrors = {};

      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.') || '_root';
        errors[key] = [...(errors[key] ?? []), issue.message];
      }

      setFieldErrors(errors);

      return;
    }

    setIsSubmitting(true);

    try {
      const result = await request<{ ticket: { id: string } }>('/api/v1/support', {
        method: 'POST',
        body: parsed.data,
      });

      router.replace(`/support/${result.ticket.id}`);
    } catch (caught) {
      if (caught instanceof ApiClientError && caught.details) {
        setFieldErrors(caught.details as FieldErrors);
      }

      setError(toUserMessage(caught));
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader title="Yangi murojaat" showBack backHref="/support" />

      <form onSubmit={handleSubmit} className="space-y-5 px-4 pt-4 pb-8">
        {error && (
          <Alert variant="error" title="Yuborilmadi">
            {error}
          </Alert>
        )}

        <Field id="category" label="Nima haqida?" errors={fieldErrors.category} required>
          <div className="grid grid-cols-2 gap-2">
            {SUPPORT_CATEGORIES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setCategory(item.value)}
                aria-pressed={category === item.value}
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors',
                  category === item.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-secondary/50',
                )}
              >
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="text-muted-foreground mt-0.5 block text-xs leading-snug">{item.hint}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field id="subject" label="Mavzu" hint="Qisqacha: nima bo'ldi?" errors={fieldErrors.subject} required>
          <Input
            id="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Masalan: Buyurtma yetkazilmadi"
            maxLength={120}
            hasError={Boolean(fieldErrors.subject)}
            disabled={isSubmitting}
          />
        </Field>

        <Field
          id="message"
          label="Batafsil"
          hint="Buyurtma raqami va sana bo'lsa, yozing — javob tezroq bo'ladi"
          errors={fieldErrors.message}
          required
        >
          <Textarea
            id="message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Nima bo'lganini tushuntiring…"
            rows={6}
            maxLength={2000}
            hasError={Boolean(fieldErrors.message)}
            disabled={isSubmitting}
          />
        </Field>

        <Button type="submit" size="lg" fullWidth isLoading={isSubmitting} loadingText="Yuborilmoqda...">
          <Send className="size-4.5" aria-hidden="true" />
          Yuborish
        </Button>

        <p className="text-muted-foreground text-center text-xs leading-relaxed">
          Javob ilovada va bildirishnomada keladi. Parol yoki tasdiqlash kodini HECH QACHON yozmang — biz
          ularni so&apos;ramaymiz.
        </p>
      </form>
    </>
  );
}

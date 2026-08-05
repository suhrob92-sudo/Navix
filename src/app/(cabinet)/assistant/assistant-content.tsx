'use client';

import { ArrowRight, Bot, Check, Send, TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { Button } from '@/components/ui/button';
import { useApiClient } from '@/hooks/use-api';
import { toUserMessage } from '@/lib/api-client';
import { formatTiyin } from '@/lib/money';
import { cn } from '@/lib/utils';
import { createIdempotencyKey } from '@/modules/wallet/wallet.schemas';
import type { AssistantAction, AssistantReply, AssistantState } from '@/modules/assistant/assistant.types';

/**
 * AI Yordamchi — suhbat oynasi.
 *
 * ── Yordamchi qanday ishlaydi ─────────────────────────────────────────
 * Matn serverga yuboriladi, u niyatni aniqlaydi va yetishmayotgan
 * ma'lumotni so'raydi ("qancha to'laymiz?"). Hammasi to'planganda
 * TASDIQLASH kartochkasi chiqadi.
 *
 * ── Nima uchun tasdiqlash majburiy ────────────────────────────────────
 * Pul harakati qaytarib bo'lmaydigan amal. Yordamchi matnni noto'g'ri
 * tushunishi mumkin — masalan summani adashtirib. Shuning uchun u hech
 * qachon o'zi to'lamaydi: aniq summa va qabul qiluvchi ko'rsatilib,
 * foydalanuvchi tugmani bosgandagina amal bajariladi.
 *
 * Amalning o'zi ODATDAGI endpointlar orqali o'tadi — ya'ni balans,
 * chegara va takroriy so'rov tekshiruvlari o'z joyida ishlaydi.
 */

interface ChatMessage {
  id: string;
  author: 'user' | 'assistant';
  text: string;
  action?: AssistantAction;
  /** Tasdiqlangan yoki bekor qilingan kartochka qayta bosilmasin. */
  actionState?: 'pending' | 'done' | 'cancelled';
  resultText?: string;
}

const GREETING: ChatMessage = {
  id: 'greeting',
  author: 'assistant',
  text:
    "Salom! Men Navix yordamchisiman. To'lov, pul o'tkazish, ovqat va mahsulot buyurtmasi — " +
    'hammasini oddiy tilda yozing. Masalan "gazga 50 ming to\'la", "2 ta lag\'mon buyur" ' +
    'yoki "telefon qidir".',
};

const STARTER_PROMPTS = ['Balansim qancha', 'Ovqat buyur', 'Telefon qidir', 'Nima qila olasan'];

export function AssistantContent() {
  const router = useRouter();
  const request = useApiClient();

  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [suggestions, setSuggestions] = useState<string[]>([...STARTER_PROMPTS]);
  const [state, setState] = useState<AssistantState>({ slots: {} });
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isThinking]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    const turn = ++counterRef.current;

    setMessages((current) => [...current, { id: `user-${turn}`, author: 'user', text: trimmed }]);
    setInput('');
    setSuggestions([]);
    setIsThinking(true);

    try {
      const result = await request<AssistantReply>('/api/v1/assistant', {
        method: 'POST',
        body: { message: trimmed, state },
      });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${turn}`,
          author: 'assistant',
          text: result.text,
          action: result.action.kind === 'none' ? undefined : result.action,
          actionState: 'pending',
        },
      ]);

      setSuggestions(result.suggestions);
      setState(result.state);
    } catch (caught) {
      setMessages((current) => [
        ...current,
        { id: `assistant-${turn}`, author: 'assistant', text: toUserMessage(caught) },
      ]);
    } finally {
      setIsThinking(false);
    }
  }

  /** Tasdiqlangan amalni ODATDAGI endpoint orqali bajaradi. */
  async function runAction(messageId: string, action: AssistantAction) {
    setIsThinking(true);

    const finish = (actionState: ChatMessage['actionState'], resultText?: string) => {
      setMessages((current) =>
        current.map((message) => (message.id === messageId ? { ...message, actionState, resultText } : message)),
      );
    };

    try {
      const idempotencyKey = createIdempotencyKey();

      if (action.kind === 'confirm_topup') {
        const result = await request<{ balanceAfter: number }>('/api/v1/wallet/topup', {
          method: 'POST',
          body: { amount: action.amountSom, method: action.method, idempotencyKey },
        });

        finish('done', `Bajarildi. Yangi balans: ${formatTiyin(result.balanceAfter)}.`);
      } else if (action.kind === 'confirm_transfer') {
        const result = await request<{ balanceAfter: number }>('/api/v1/wallet/transfer', {
          method: 'POST',
          body: { phone: action.phone, amount: action.amountSom, idempotencyKey },
        });

        finish('done', `Yuborildi. Qolgan balans: ${formatTiyin(result.balanceAfter)}.`);
      } else if (action.kind === 'confirm_payment') {
        const result = await request<{ id: string; receiptNumber: string }>('/api/v1/payments', {
          method: 'POST',
          body: {
            providerId: action.providerId,
            accountNumber: action.accountNumber,
            amount: action.amountSom,
            idempotencyKey,
          },
        });

        finish('done', `To'landi. Chek: ${result.receiptNumber}`);

        setMessages((current) => [
          ...current,
          {
            id: `assistant-receipt-${result.id}`,
            author: 'assistant',
            text: "Chekni ko'rishingiz mumkin.",
            action: { kind: 'navigate', href: `/payments/receipt/${result.id}`, label: 'Chekni ochish' },
            actionState: 'pending',
          },
        ]);
      } else if (action.kind === 'confirm_food_order') {
        /**
         * Buyurtma ODATDAGI endpoint orqali beriladi — savat sahifasi
         * ham xuddi shu yo'ldan yuradi. Narx, eng kam buyurtma va
         * restoran ochiqligi serverda qaytadan tekshiriladi.
         */
        // Javob `{ order: ... }` ichida keladi — savat sahifasi ham
        // xuddi shu endpointdan xuddi shunday o'qiydi.
        const { order } = await request<{ order: { id: string; orderNumber: string } }>(
          '/api/v1/food/orders',
          {
            method: 'POST',
            body: {
              restaurantId: action.restaurantId,
              addressId: action.addressId,
              items: [{ menuItemId: action.menuItemId, quantity: action.quantity }],
              idempotencyKey,
            },
          },
        );

        finish('done', `Buyurtma qabul qilindi: ${order.orderNumber}`);

        setMessages((current) => [
          ...current,
          {
            id: `assistant-order-${order.id}`,
            author: 'assistant',
            text: `Taxminan ${action.deliveryMinutes} daqiqada yetkaziladi. Holatini kuzatib borishingiz mumkin.`,
            action: { kind: 'navigate', href: `/orders/${order.id}`, label: "Buyurtmani ko'rish" },
            actionState: 'pending',
          },
        ]);
      } else if (action.kind === 'confirm_market_order') {
        /**
         * Marketplace buyurtmasi ham ODATDAGI endpoint orqali beriladi.
         * Narx, ZAXIRA va eng kam buyurtma serverda qaytadan
         * tekshiriladi — yordamchi ularni chetlab o'ta olmaydi.
         */
        const { order } = await request<{ order: { id: string; orderNumber: string } }>(
          '/api/v1/market/orders',
          {
            method: 'POST',
            body: {
              shopId: action.shopId,
              addressId: action.addressId,
              items: [{ productId: action.productId, quantity: action.quantity }],
              idempotencyKey,
            },
          },
        );

        finish('done', `Buyurtma qabul qilindi: ${order.orderNumber}`);

        setMessages((current) => [
          ...current,
          {
            id: `assistant-market-${order.id}`,
            author: 'assistant',
            text: `Taxminan ${action.deliveryDays} kunda yetkaziladi. Holatini kuzatib borishingiz mumkin.`,
            action: {
              kind: 'navigate',
              href: `/marketplace/orders/${order.id}`,
              label: "Buyurtmani ko'rish",
            },
            actionState: 'pending',
          },
        ]);
      }
    } catch (caught) {
      finish('cancelled', toUserMessage(caught));
    } finally {
      setIsThinking(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col">
      <AppHeader title="AI Yordamchi" />

      <div className="flex-1 space-y-4 px-4 py-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isBusy={isThinking}
            onConfirm={() => message.action && runAction(message.id, message.action)}
            onCancel={() =>
              setMessages((current) =>
                current.map((item) =>
                  item.id === message.id
                    ? { ...item, actionState: 'cancelled', resultText: 'Bekor qilindi.' }
                    : item,
                ),
              )
            }
            onNavigate={(href) => router.push(href)}
          />
        ))}

        {isThinking && <ThinkingBubble />}

        <div ref={bottomRef} />
      </div>

      {suggestions.length > 0 && (
        <div className="scrollbar-slim flex gap-2 overflow-x-auto px-4 pb-3">
          {suggestions.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void send(prompt)}
              className="bg-card border-border hover:border-ring shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-background/95 sticky bottom-0 flex items-center gap-2 px-4 py-3 backdrop-blur-md"
      >
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Xabar yozing..."
          aria-label="Xabar matni"
          className="bg-card border-border focus-visible:border-ring focus-visible:ring-ring h-12 min-w-0 flex-1 rounded-full border px-5 text-base outline-none focus-visible:ring-2"
        />

        <button
          type="submit"
          disabled={!input.trim() || isThinking}
          aria-label="Yuborish"
          className="bg-primary text-primary-foreground inline-flex size-12 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 disabled:opacity-50"
        >
          <Send className="size-5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  isBusy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onNavigate: (href: string) => void;
}

function MessageBubble({ message, isBusy, onConfirm, onCancel, onNavigate }: MessageBubbleProps) {
  const isUser = message.author === 'user';

  // Turni toraytiramiz — TypeScript `href` mavjudligiga ishonch hosil qilsin.
  const navigateAction = message.action?.kind === 'navigate' ? message.action : null;

  return (
    <div className={cn('flex gap-2.5', isUser && 'justify-end')}>
      {!isUser && (
        <span className="from-primary to-accent mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br">
          <Bot className="text-primary-foreground size-4" aria-hidden="true" />
        </span>
      )}

      <div className={cn('max-w-[85%] space-y-2', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-card border-border rounded-bl-md border',
          )}
        >
          {message.text}
        </div>

        {navigateAction && (
          <Button variant="outline" size="sm" onClick={() => onNavigate(navigateAction.href)}>
            {navigateAction.label}
            <ArrowRight aria-hidden="true" />
          </Button>
        )}

        {message.action && message.action.kind.startsWith('confirm_') && (
          <ConfirmCard
            action={message.action}
            actionState={message.actionState ?? 'pending'}
            resultText={message.resultText}
            isBusy={isBusy}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        )}
      </div>
    </div>
  );
}

interface ConfirmCardProps {
  action: AssistantAction;
  actionState: NonNullable<ChatMessage['actionState']>;
  resultText?: string;
  isBusy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Tasdiqlash kartochkasi.
 *
 * Summa va qabul qiluvchi ATAYLAB katta yozilgan: foydalanuvchi tugmani
 * bosishdan oldin nima bo'layotganini aniq ko'rishi kerak.
 */
function ConfirmCard({ action, actionState, resultText, isBusy, onConfirm, onCancel }: ConfirmCardProps) {
  if (action.kind === 'none' || action.kind === 'navigate') return null;

  /**
   * `wrap` — uzun qiymat kesilmasin.
   *
   * Manzil eng muhim maydon: ovqat QAYERGA borishini foydalanuvchi
   * tasdiqlashdan oldin to'liq o'qishi kerak. Qolgan qiymatlar qisqa,
   * ular bir qatorga sig'adi.
   */
  const rows: { label: string; value: string; wrap?: boolean }[] = [];
  let amountSom = 0;

  if (action.kind === 'confirm_topup') {
    amountSom = action.amountSom;
    rows.push({ label: 'Usul', value: 'Bank kartasi' });
  } else if (action.kind === 'confirm_transfer') {
    amountSom = action.amountSom;
    rows.push({ label: 'Kimga', value: action.recipientName });
    rows.push({ label: 'Raqam', value: action.phone });
  } else if (action.kind === 'confirm_food_order') {
    amountSom = action.amountSom;
    rows.push({ label: 'Taom', value: `${action.quantity} × ${action.itemName}` });
    rows.push({ label: 'Restoran', value: action.restaurantName });
    rows.push({ label: 'Manzil', value: action.addressLine, wrap: true });
    // Yetkazish haqi alohida ko'rsatiladi: umumiy summa nimadan
    // iboratligi foydalanuvchiga tushunarli bo'lishi kerak.
    rows.push({ label: 'Taomlar', value: formatTiyin(action.subtotalSom * 100) });
    rows.push({ label: 'Yetkazish', value: formatTiyin(action.deliveryFeeSom * 100) });
  } else if (action.kind === 'confirm_market_order') {
    amountSom = action.amountSom;
    rows.push({ label: 'Mahsulot', value: `${action.quantity} × ${action.itemName}` });
    rows.push({ label: "Do'kon", value: action.shopName });
    rows.push({ label: 'Manzil', value: action.addressLine, wrap: true });
    rows.push({ label: 'Mahsulotlar', value: formatTiyin(action.subtotalSom * 100) });
    rows.push({ label: 'Yetkazish', value: formatTiyin(action.deliveryFeeSom * 100) });
  } else {
    amountSom = action.amountSom;
    rows.push({ label: 'Xizmat', value: action.providerName });
    rows.push({ label: 'Hisob', value: action.accountNumber });
  }

  if (actionState === 'done') {
    return (
      <div className="bg-success/10 text-success flex items-start gap-2 rounded-2xl px-4 py-3 text-sm">
        <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{resultText}</span>
      </div>
    );
  }

  if (actionState === 'cancelled') {
    return (
      <div className="bg-secondary text-muted-foreground flex items-start gap-2 rounded-2xl px-4 py-3 text-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{resultText}</span>
      </div>
    );
  }

  return (
    <div className="bg-card border-border rounded-2xl border p-4">
      <p className="text-2xl font-semibold tabular-nums">{formatTiyin(amountSom * 100)}</p>

      <dl className="mt-3 space-y-1.5 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground shrink-0">{row.label}</dt>
            <dd className={cn('font-medium', row.wrap ? 'text-right leading-relaxed' : 'truncate')}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex gap-2">
        <Button size="sm" className="flex-1" onClick={onConfirm} isLoading={isBusy}>
          Tasdiqlash
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={isBusy}>
          Bekor qilish
        </Button>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-2.5">
      <span className="from-primary to-accent inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br">
        <Bot className="text-primary-foreground size-4" aria-hidden="true" />
      </span>

      <div className="bg-card border-border flex items-center gap-1 rounded-2xl rounded-bl-md border px-4 py-3">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="bg-muted-foreground/60 size-1.5 animate-bounce rounded-full"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

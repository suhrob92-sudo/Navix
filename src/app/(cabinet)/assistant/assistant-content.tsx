'use client';

import { ArrowRight, Bot, Send } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { AppHeader } from '@/components/app/app-header';
import { ServiceIcon } from '@/components/app/service-icon';
import { Badge } from '@/components/ui/badge';
import { ModuleStatus, matchModuleByIntent, type AppModule } from '@/config/modules';
import { cn } from '@/lib/utils';

/**
 * AI Yordamchi — suhbat oynasi.
 *
 * HOZIRGI HOLAT: javoblar `matchModuleByIntent()` orqali kalit so'z bo'yicha
 * topiladi. Ya'ni "taxi chaqir" desangiz — taksi moduli taklif qilinadi.
 * Bu haqiqiy ishlaydigan mantiq, soxta javob emas.
 *
 * KEYINGI BOSQICH: shu joyga til modeli (LLM) ulanadi va u modulni
 * o'zi ishga tushiradigan bo'ladi. Suhbat oynasi o'zgarmaydi — faqat
 * javob manbai almashadi.
 */

interface ChatMessage {
  id: string;
  author: 'user' | 'assistant';
  text: string;
  /** Javobga biriktirilgan modul kartochkasi. */
  suggestion?: AppModule;
}

/** Foydalanuvchiga boshlash uchun tayyor iboralar. */
const SUGGESTED_PROMPTS = [
  'Taxi chaqir',
  'Pizza buyurtma qil',
  'Ish top',
  "Kommunal to'lovlarni to'la",
] as const;

const GREETING: ChatMessage = {
  id: 'greeting',
  author: 'assistant',
  text: 'Salom! Sizga qanday yordam bera olaman? 👋 Masalan: "taxi chaqir" yoki "pizza buyurtma qil".',
};

/** Foydalanuvchi xabariga javob tayyorlaydi. */
function buildReply(text: string, id: string): ChatMessage {
  const matched = matchModuleByIntent(text);

  if (!matched) {
    return {
      id,
      author: 'assistant',
      text: "Kechirasiz, buni hali tushunmadim. Hozircha men xizmatlarni topishga yordam bera olaman — masalan \"taxi chaqir\", \"ovqat buyurtma qil\" yoki \"ish top\" deb yozib ko'ring.",
    };
  }

  const isAvailable = matched.status === ModuleStatus.LIVE;

  return {
    id,
    author: 'assistant',
    text: isAvailable
      ? `Albatta! "${matched.name}" xizmatini ochaman.`
      : `Tushundim — bu "${matched.name}" xizmatiga tegishli. U hozir ishlab chiqilmoqda, tez orada tayyor bo'ladi.`,
    suggestion: matched,
  };
}

export function AssistantContent() {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  // Xabar kalitlari uchun oddiy hisoblagich — `Date.now()` render paytida
  // barqaror bo'lmagan natija bergani uchun ishlatilmaydi.
  const messageCounterRef = useRef(0);

  // Yangi xabar kelganda pastga suramiz.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isThinking]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    const turn = ++messageCounterRef.current;
    const userMessage: ChatMessage = { id: `user-${turn}`, author: 'user', text: trimmed };

    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsThinking(true);

    // Qisqa kechikish — javob "o'ylab" berilayotgandek ko'rinadi va
    // xabarlar birdaniga chiqib ketmaydi.
    setTimeout(() => {
      setMessages((current) => [...current, buildReply(trimmed, `assistant-${turn}`)]);
      setIsThinking(false);
    }, 500);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    send(input);
  }

  return (
    <div className="flex min-h-[calc(100dvh-6rem)] flex-col">
      <AppHeader title="AI Yordamchi" />

      {/* Suhbat */}
      <div className="flex-1 space-y-4 px-4 py-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isThinking && <ThinkingBubble />}

        <div ref={bottomRef} />
      </div>

      {/* Tayyor iboralar — faqat suhbat boshida */}
      {messages.length === 1 && (
        <div className="scrollbar-slim flex gap-2 overflow-x-auto px-4 pb-3">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => send(prompt)}
              className="bg-card border-border hover:border-ring shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Xabar yozish */}
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

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.author === 'user';

  return (
    <div className={cn('flex gap-2.5', isUser && 'justify-end')}>
      {!isUser && (
        <span className="from-primary to-accent mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br">
          <Bot className="text-primary-foreground size-4" aria-hidden="true" />
        </span>
      )}

      <div className={cn('max-w-[80%] space-y-2', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-card border-border rounded-bl-md border',
          )}
        >
          {message.text}
        </div>

        {message.suggestion && <SuggestionCard appModule={message.suggestion} />}
      </div>
    </div>
  );
}

function SuggestionCard({ appModule }: { appModule: AppModule }) {
  const isAvailable = appModule.status === ModuleStatus.LIVE;

  const content = (
    <div className="bg-card border-border flex items-center gap-3 rounded-2xl border p-3">
      <ServiceIcon icon={appModule.icon} color={appModule.color} size="sm" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{appModule.name}</p>
        <p className="text-muted-foreground truncate text-xs">{appModule.description}</p>
      </div>

      {isAvailable ? (
        <ArrowRight className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      ) : (
        <Badge variant="outline" className="shrink-0">
          Rejada
        </Badge>
      )}
    </div>
  );

  if (!isAvailable) return content;

  return (
    <Link href={appModule.href} className="block transition-transform active:scale-[0.99]">
      {content}
    </Link>
  );
}

/** Javob tayyorlanayotganini bildiruvchi uch nuqta. */
function ThinkingBubble() {
  return (
    <div className="flex gap-2.5">
      <span className="from-primary to-accent mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br">
        <Bot className="text-primary-foreground size-4" aria-hidden="true" />
      </span>

      <div
        className="bg-card border-border flex items-center gap-1 rounded-2xl rounded-bl-md border px-4 py-3.5"
        role="status"
        aria-label="Javob tayyorlanmoqda"
      >
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="bg-muted-foreground size-1.5 animate-bounce rounded-full"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

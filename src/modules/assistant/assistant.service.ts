import { MAX_TOP_UP_SOM, MIN_TOP_UP_SOM, formatTiyin } from '@/lib/money';
import { prisma } from '@/lib/prisma';
import { matchModuleByIntent, ModuleStatus } from '@/config/modules';
import { Intent, parseMessage, type IntentName } from '@/modules/assistant/intent';
import { handleFoodOrder, handleFoodStatus } from '@/modules/assistant/assistant.food-flow';
import { getWalletSummary } from '@/modules/wallet/wallet.service';
import { listSavedAccounts } from '@/modules/payment/payment.service';
import type {
  AssistantAction,
  AssistantReply,
  AssistantSlots,
  AssistantState,
} from '@/modules/assistant/assistant.types';

/**
 * AI Yordamchining "miyasi".
 *
 * ── Ish tartibi ───────────────────────────────────────────────────────
 * 1. Matndan niyat va ma'lumot ajratiladi (`intent.ts`);
 * 2. Yangi ma'lumot eski holat ustiga qo'yiladi (slot filling);
 * 3. Yetishmayotgan ma'lumot so'raladi;
 * 4. Hammasi to'planganda TASDIQLASH so'raladi.
 *
 * ── Eng muhim qoida ───────────────────────────────────────────────────
 * Yordamchi PULNI O'ZI HARAKATLANTIRMAYDI. U faqat buyruqni tayyorlaydi
 * va foydalanuvchi tugmani bosgach, mijoz odatdagi endpointga murojaat
 * qiladi. Shunda barcha tekshiruvlar (balans, chegara, takroriy so'rov)
 * o'z joyida ishlaydi va yordamchi ularni chetlab o'ta olmaydi.
 */

/** Bo'sh javob uchun yordamchi. */
function reply(
  text: string,
  options: { suggestions?: string[]; action?: AssistantAction; state?: AssistantState } = {},
): AssistantReply {
  return {
    text,
    suggestions: options.suggestions ?? [],
    action: options.action ?? { kind: 'none' },
    state: options.state ?? { slots: {} },
  };
}

/** Suhbat tugadi — holat tozalanadi. */
const EMPTY_STATE: AssistantState = { slots: {} };

const DEFAULT_SUGGESTIONS = ['Balansim qancha', "Kommunal to'la", 'Ovqat buyur', 'Nima qila olasan'];

/**
 * Ovqat buyurtmasida summa CHEGARA sifatida tushuniladi.
 *
 * "50 minggacha nimadir" — bu narx chegarasi. Lekin "2 ta osh" dagi
 * 2 ni ham summa deb o'qib qo'ymaslik uchun quyi chegara qo'yamiz:
 * hech qanday taom 1 000 so'mdan arzon emas.
 */
const MIN_FOOD_BUDGET_SOM = 1_000;

// ── Alohida niyatlar ──────────────────────────────────────────────────

async function handleBalance(userId: string): Promise<AssistantReply> {
  const wallet = await getWalletSummary(userId, 1);

  const text =
    wallet.balance > 0
      ? `Hamyoningizda ${formatTiyin(wallet.balance)} bor.`
      : "Hamyoningiz bo'sh. Hisobni to'ldirishni xohlaysizmi?";

  return reply(text, {
    suggestions: wallet.balance > 0 ? ["Kommunal to'la", "Hisobni to'ldir"] : ["50 ming to'ldir"],
    action: { kind: 'navigate', href: '/wallet', label: 'Hamyonni ochish' },
  });
}

function handleHelp(): AssistantReply {
  return reply(
    'Men quyidagilarni qila olaman:\n' +
      '• Balansingizni aytaman — "balansim qancha"\n' +
      '• Hisobni to\'ldiraman — "50 ming to\'ldir"\n' +
      '• Kommunal to\'lovni bajaraman — "gazga 50 ming to\'la"\n' +
      '• Pul o\'tkazaman — "901234567 ga 20 ming yubor"\n' +
      '• Ovqat buyurtma qilaman — "2 ta lag\'mon buyur"\n' +
      '• Buyurtmangiz qayerdaligini aytaman — "buyurtmam qayerda"\n' +
      '• Tarixni ko\'rsataman — "to\'lovlar tarixi"\n\n' +
      'Shunchaki oddiy tilda yozing.',
    { suggestions: DEFAULT_SUGGESTIONS },
  );
}

function handleHistory(): AssistantReply {
  return reply("Amallar tarixini ochaman — u yerda barcha to'lov va o'tkazmalar bor.", {
    action: { kind: 'navigate', href: '/wallet/history', label: 'Tarixni ochish' },
    suggestions: ['Balansim qancha'],
  });
}

/** Hisobni to'ldirish — faqat summa kerak. */
function handleTopUp(slots: AssistantSlots): AssistantReply {
  const amount = slots.amountSom;

  if (!amount) {
    return reply("Qancha to'ldiramiz?", {
      suggestions: ['10 ming', '50 ming', '100 ming'],
      state: { intent: Intent.TOPUP, slots },
    });
  }

  if (amount < MIN_TOP_UP_SOM || amount > MAX_TOP_UP_SOM) {
    return reply(
      `To'ldirish summasi ${MIN_TOP_UP_SOM.toLocaleString('uz-UZ')} dan ` +
        `${MAX_TOP_UP_SOM.toLocaleString('uz-UZ')} so'mgacha bo'lishi kerak. Boshqa summa ayting.`,
      { state: { intent: Intent.TOPUP, slots: {} } },
    );
  }

  return reply(`Hamyoningizni ${formatTiyin(amount * 100)} ga to'ldiramizmi?`, {
    action: { kind: 'confirm_topup', amountSom: amount, method: 'CARD' },
    state: EMPTY_STATE,
  });
}

/** Pul o'tkazish — raqam va summa kerak, qabul qiluvchi tekshiriladi. */
async function handleTransfer(userId: string, slots: AssistantSlots): Promise<AssistantReply> {
  if (!slots.phone) {
    return reply('Kimga yuboramiz? Telefon raqamini yozing (masalan 90 123 45 67).', {
      state: { intent: Intent.TRANSFER, slots },
    });
  }

  // Qabul qiluvchini oldindan tekshiramiz — xato raqamga pul ketmasin.
  const recipient = await prisma.user.findUnique({
    where: { phone: slots.phone },
    select: { id: true, firstName: true, lastName: true, deletedAt: true },
  });

  if (!recipient || recipient.deletedAt) {
    return reply(`${slots.phone} raqami bilan foydalanuvchi topilmadi. Raqamni tekshirib, qaytadan yozing.`, {
      state: { intent: Intent.TRANSFER, slots: { amountSom: slots.amountSom } },
    });
  }

  if (recipient.id === userId) {
    return reply('Bu sizning raqamingiz. Boshqa odamning raqamini yozing.', {
      state: { intent: Intent.TRANSFER, slots: { amountSom: slots.amountSom } },
    });
  }

  const recipientName =
    [recipient.firstName, recipient.lastName].filter(Boolean).join(' ') || 'Navix foydalanuvchisi';

  if (!slots.amountSom) {
    return reply(`${recipientName} ga qancha yuboramiz?`, {
      suggestions: ['10 ming', '50 ming', '100 ming'],
      state: { intent: Intent.TRANSFER, slots: { ...slots, recipientName } },
    });
  }

  // Balans yetishini oldindan aytamiz — tasdiqlagandan keyin xato chiqmasin.
  const wallet = await getWalletSummary(userId, 1);

  if (wallet.available < slots.amountSom * 100) {
    return reply(
      `Hamyoningizda ${formatTiyin(wallet.available)} bor, bu yetmaydi. ` + `Avval hisobni to'ldiraymizmi?`,
      {
        suggestions: ["Hisobni to'ldir"],
        action: { kind: 'navigate', href: '/wallet/topup', label: "To'ldirish" },
        state: EMPTY_STATE,
      },
    );
  }

  return reply(`${recipientName} ga ${formatTiyin(slots.amountSom * 100)} yuboramizmi?`, {
    action: {
      kind: 'confirm_transfer',
      phone: slots.phone,
      recipientName,
      amountSom: slots.amountSom,
    },
    state: EMPTY_STATE,
  });
}

/** Xizmat to'lovi — provayder, hisob raqami va summa kerak. */
async function handlePayService(
  userId: string,
  slots: AssistantSlots,
  parsed: { providerCode: string | null; category: string | null },
): Promise<AssistantReply> {
  // 1. Provayder
  let providerId = slots.providerId;
  let providerName = slots.providerName;
  let accountLabel = 'Hisob raqami';
  let accountHint = '';

  if (!providerId) {
    const provider = parsed.providerCode
      ? await prisma.serviceProvider.findFirst({
          where: { code: parsed.providerCode, isActive: true },
          select: { id: true, name: true, accountLabel: true, accountHint: true },
        })
      : null;

    if (provider) {
      providerId = provider.id;
      providerName = provider.name;
      accountLabel = provider.accountLabel;
      accountHint = provider.accountHint;
    } else {
      // Toifa aytilgan bo'lsa — o'sha toifadagi xizmatlarni taklif qilamiz.
      const category = parsed.category;

      const options = await prisma.serviceProvider.findMany({
        where: { isActive: true, ...(category ? { category: category as never } : {}) },
        select: { name: true },
        orderBy: { sortOrder: 'asc' },
        take: 5,
      });

      return reply(
        options.length > 0
          ? `Qaysi xizmatga to'laymiz? Masalan: ${options.map((option) => option.name).join(', ')}.`
          : "Qaysi xizmatga to'laymiz?",
        {
          suggestions: options.slice(0, 3).map((option) => `${option.name} ga to'la`),
          action: { kind: 'navigate', href: '/payments', label: "To'lovlarni ochish" },
          state: { intent: Intent.PAY_SERVICE, slots },
        },
      );
    }
  } else {
    const provider = await prisma.serviceProvider.findUnique({
      where: { id: providerId },
      select: { accountLabel: true, accountHint: true },
    });

    accountLabel = provider?.accountLabel ?? accountLabel;
    accountHint = provider?.accountHint ?? '';
  }

  const nextSlots: AssistantSlots = { ...slots, providerId, providerName };

  // 2. Hisob raqami — avval saqlanganlardan qidiramiz.
  if (!nextSlots.accountNumber) {
    const saved = await listSavedAccounts(userId);
    const match = saved.find((account) => account.provider.id === providerId);

    if (match) {
      nextSlots.accountNumber = match.accountNumber;
    } else {
      return reply(
        `${providerName} uchun ${accountLabel.toLowerCase()}ni yozing${accountHint ? ` (masalan ${accountHint})` : ''}.`,
        { state: { intent: Intent.PAY_SERVICE, slots: nextSlots } },
      );
    }
  }

  // 3. Summa
  if (!nextSlots.amountSom) {
    return reply(`${providerName} uchun qancha to'laymiz?`, {
      suggestions: ['20 ming', '50 ming', '100 ming'],
      state: { intent: Intent.PAY_SERVICE, slots: nextSlots },
    });
  }

  // 4. Balansni oldindan tekshiramiz.
  const wallet = await getWalletSummary(userId, 1);

  if (wallet.available < nextSlots.amountSom * 100) {
    return reply(`Hamyoningizda ${formatTiyin(wallet.available)} bor, bu yetmaydi. Avval hisobni to'ldiring.`, {
      suggestions: ["Hisobni to'ldir"],
      action: { kind: 'navigate', href: '/wallet/topup', label: "To'ldirish" },
      state: EMPTY_STATE,
    });
  }

  return reply(
    `${providerName} — ${nextSlots.accountNumber} hisobiga ` +
      `${formatTiyin(nextSlots.amountSom * 100)} to'laymizmi?`,
    {
      action: {
        kind: 'confirm_payment',
        providerId: providerId!,
        providerName: providerName!,
        accountNumber: nextSlots.accountNumber,
        amountSom: nextSlots.amountSom,
      },
      state: EMPTY_STATE,
    },
  );
}

/** Tushunilmagan matn — modul qidirib ko'ramiz. */
function handleUnknown(rawText: string): AssistantReply {
  const matched = matchModuleByIntent(rawText);

  if (!matched) {
    return reply(
      "Buni hali tushunmadim. Men to'lov, o'tkazma va balans bilan yordam bera olaman — " +
        '"nima qila olasan" deb yozsangiz ro\'yxatni ko\'rsataman.',
      { suggestions: DEFAULT_SUGGESTIONS },
    );
  }

  if (matched.status !== ModuleStatus.LIVE) {
    return reply(
      `Bu "${matched.name}" xizmatiga tegishli. U hozir ishlab chiqilmoqda, tez orada tayyor bo'ladi.`,
      {
        suggestions: DEFAULT_SUGGESTIONS,
      },
    );
  }

  return reply(`"${matched.name}" xizmatini ochaman.`, {
    action: { kind: 'navigate', href: matched.href, label: `${matched.name}ni ochish` },
  });
}

// ── Asosiy kirish nuqtasi ─────────────────────────────────────────────

/**
 * Foydalanuvchi xabariga javob tayyorlaydi.
 *
 * @param userId Kim so'rayapti — balans va saqlangan hisoblar shunga bog'liq
 * @param message Foydalanuvchi matni
 * @param state Oldingi javobdan qaytgan holat (ko'p qadamli suhbat uchun)
 */
export async function respond(
  userId: string,
  message: string,
  state: AssistantState = EMPTY_STATE,
): Promise<AssistantReply> {
  const parsed = parseMessage(message);

  // Yangi ma'lumot eski holat ustiga qo'yiladi.
  const slots: AssistantSlots = {
    ...state.slots,
    ...(parsed.amountSom !== null ? { amountSom: parsed.amountSom } : {}),
    ...(parsed.phone !== null ? { phone: parsed.phone } : {}),
    ...(parsed.accountNumber !== null ? { accountNumber: parsed.accountNumber } : {}),
    ...(parsed.quantity !== null ? { quantity: parsed.quantity } : {}),
  };

  /**
   * Niyat yangi matndan aniqlansa — o'sha ustun.
   * Aniqlanmasa, boshlangan suhbat davom etadi ("qancha?" → "50 ming").
   */
  const intent: IntentName =
    parsed.intent !== Intent.UNKNOWN ? parsed.intent : ((state.intent as IntentName) ?? Intent.UNKNOWN);

  // Yangi buyruq boshlansa, eski provayder tanlovi tozalanadi.
  if (parsed.providerCode && parsed.intent === Intent.PAY_SERVICE) {
    delete slots.providerId;
    delete slots.providerName;
    if (parsed.accountNumber === null) delete slots.accountNumber;
  }

  switch (intent) {
    case Intent.BALANCE:
      return handleBalance(userId);

    case Intent.HELP:
      return handleHelp();

    case Intent.HISTORY:
      return handleHistory();

    case Intent.TOPUP:
      return handleTopUp(slots);

    case Intent.TRANSFER:
      return handleTransfer(userId, slots);

    case Intent.PAY_SERVICE:
      return handlePayService(userId, slots, {
        providerCode: parsed.providerCode,
        category: parsed.category,
      });

    case Intent.FOOD_STATUS:
      return handleFoodStatus(userId);

    case Intent.FOOD_ORDER:
      return handleFoodOrder({
        userId,
        slots,
        foodQuery: parsed.foodQuery,
        quantity: parsed.quantity,
        ordinal: parsed.ordinal,
        // Kichik son — bu soni, narx chegarasi emas.
        maxPriceSom:
          parsed.amountSom !== null && parsed.amountSom >= MIN_FOOD_BUDGET_SOM ? parsed.amountSom : null,
      });

    default:
      return handleUnknown(message);
  }
}

/** Bosh sahifada ko'rsatiladigan boshlang'ich taklif. */
export function getGreeting(): AssistantReply {
  return reply(
    "Salom! Men Navix yordamchisiman. To'lov qilish, pul o'tkazish, ovqat buyurtma qilish yoki " +
      'balansni bilish uchun oddiy tilda yozing — masalan "gazga 50 ming to\'la" yoki ' +
      '"2 ta lag\'mon buyur".',
    { suggestions: DEFAULT_SUGGESTIONS },
  );
}

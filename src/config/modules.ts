import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  Bot,
  Briefcase,
  Building2,
  Bus,
  Car,
  CreditCard,
  Hotel,
  LayoutDashboard,
  Map,
  Megaphone,
  MessageCircle,
  Package,
  PackageSearch,
  Plane,
  ShieldCheck,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';

/**
 * SUPER APP MODULLAR REYESTRI — yagona haqiqat manbai (single source of truth).
 *
 * Nima uchun kerak:
 *  - Bosh sahifa, menyu, qidiruv, AI Assistant va ruxsatlar tizimi
 *    hammasi shu bitta ro'yxatdan oziqlanadi;
 *  - Yangi modul qo'shish uchun faqat shu faylga bitta yozuv qo'shiladi,
 *    qolgan joylar avtomatik yangilanadi;
 *  - AI Assistant `aiIntents` orqali foydalanuvchi gapini modulga bog'laydi
 *    (masalan "taxi chaqir" → taxi moduli).
 */

/** Modulning ishlab chiqilish holati. */
export const ModuleStatus = {
  /** Ishga tushgan va foydalanuvchilarga ochiq. */
  LIVE: 'live',
  /** Hozirda ishlab chiqilmoqda. */
  IN_PROGRESS: 'in-progress',
  /** Rejalashtirilgan, hali boshlanmagan. */
  PLANNED: 'planned',
} as const;

export type ModuleStatusValue = (typeof ModuleStatus)[keyof typeof ModuleStatus];

/** Modullar guruhlari — bosh sahifada bo'limlarga ajratish uchun. */
export const ModuleCategory = {
  MOBILITY: 'mobility',
  COMMERCE: 'commerce',
  FINANCE: 'finance',
  WORK: 'work',
  TRAVEL: 'travel',
  PLATFORM: 'platform',
} as const;

export type ModuleCategoryValue = (typeof ModuleCategory)[keyof typeof ModuleCategory];

/**
 * Xizmat ikonkalari uchun rang nomlari.
 * Ro'yxat qisqa va aniq — har bir yangi modul shulardan birini tanlaydi.
 */
export type ServiceColor =
  | 'amber'
  | 'rose'
  | 'blue'
  | 'orange'
  | 'green'
  | 'pink'
  | 'teal'
  | 'violet'
  | 'sky'
  | 'indigo'
  | 'slate';

export interface AppModule {
  /** Barqaror identifikator — baza va ruxsatlar tizimida ishlatiladi. */
  id: string;
  /** Foydalanuvchiga ko'rinadigan nom. */
  name: string;
  /** Bir jumlalik tavsif. */
  description: string;
  /** Ilova ichidagi asosiy manzil. */
  href: string;
  icon: LucideIcon;
  category: ModuleCategoryValue;
  status: ModuleStatusValue;
  /**
   * Ikonka rangi. Maketdagi kabi har bir xizmat o'z rangiga ega —
   * foydalanuvchi ularni matnni o'qimasdan, rang bo'yicha tanib oladi.
   * Aniq CSS class'lari `src/components/app/service-icon.tsx` da.
   */
  color: ServiceColor;
  /**
   * Bosh sahifadagi "Tezkor xizmatlar" to'rida ko'rinadimi.
   * Tartib raqami — kichikroq son oldinroq turadi.
   */
  quickOrder?: number;
  /**
   * AI Assistant uchun kalit iboralar. Foydalanuvchi shulardan birini
   * aytsa — shu modul ishga tushadi.
   */
  aiIntents: string[];
}

export interface ModuleCategoryMeta {
  id: ModuleCategoryValue;
  name: string;
  description: string;
}

export const MODULE_CATEGORIES: readonly ModuleCategoryMeta[] = [
  {
    id: ModuleCategory.MOBILITY,
    name: 'Harakat',
    description: "Shahar bo'ylab yurish va yetkazib berish xizmatlari",
  },
  {
    id: ModuleCategory.COMMERCE,
    name: 'Savdo',
    description: "Ovqat, do'kon va e'lonlar — bitta ilovada",
  },
  { id: ModuleCategory.FINANCE, name: 'Moliya', description: "To'lovlar va raqamli hamyon" },
  { id: ModuleCategory.WORK, name: 'Ish', description: "Ish o'rni topish va biznes yuritish" },
  { id: ModuleCategory.TRAVEL, name: 'Sayohat', description: 'Mehmonxona va sayohat bandlovi' },
  { id: ModuleCategory.PLATFORM, name: 'Platforma', description: 'Ilovani birlashtirib turuvchi tizimlar' },
] as const;

export const APP_MODULES: readonly AppModule[] = [
  {
    id: 'taxi',
    name: 'Taksi',
    description: "Bir tugma bilan mashina chaqiring va yo'lni jonli kuzating.",
    href: '/taxi',
    icon: Car,
    category: ModuleCategory.MOBILITY,
    status: ModuleStatus.PLANNED,
    color: 'amber',
    quickOrder: 1,
    aiIntents: ['taxi chaqir', 'mashina chaqir', 'taksi buyurtma', 'meni olib ket'],
  },
  {
    id: 'courier',
    name: 'Kuryer',
    description: 'Shahar ichida hujjat va buyumlarni tezkor yetkazing.',
    href: '/courier',
    icon: Package,
    category: ModuleCategory.MOBILITY,
    status: ModuleStatus.PLANNED,
    color: 'indigo',
    quickOrder: 10,
    aiIntents: ['kuryer chaqir', 'pochta yubor', 'buyum yetkaz'],
  },
  {
    id: 'delivery',
    name: 'Yetkazib berish',
    description: "Viloyatlararo yuk va posilkalarni kuzatuv bilan jo'nating.",
    href: '/delivery',
    icon: Bus,
    category: ModuleCategory.MOBILITY,
    status: ModuleStatus.PLANNED,
    color: 'pink',
    quickOrder: 6,
    aiIntents: ["yuk jo'nat", 'posilka yubor', 'yetkazib berish'],
  },
  {
    id: 'food',
    name: 'Ovqat yetkazish',
    description: 'Yaqin atrofdagi restoranlardan issiq ovqat buyurtma qiling.',
    href: '/food',
    icon: UtensilsCrossed,
    category: ModuleCategory.COMMERCE,
    status: ModuleStatus.PLANNED,
    color: 'rose',
    quickOrder: 2,
    aiIntents: ['ovqat buyurtma qil', 'pizza buyurtma qil', 'ovqat yetkaz', 'och qoldim'],
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Minglab sotuvchilar bitta savdo maydonchasida.',
    href: '/marketplace',
    icon: Store,
    category: ModuleCategory.COMMERCE,
    status: ModuleStatus.PLANNED,
    color: 'blue',
    quickOrder: 3,
    aiIntents: ['mahsulot qidir', 'marketplace och', 'sotib olmoqchiman'],
  },
  {
    id: 'shop',
    name: "Onlayn do'kon",
    description: "O'z brendingiz uchun shaxsiy do'kon oching.",
    href: '/shop',
    icon: ShoppingBag,
    category: ModuleCategory.COMMERCE,
    status: ModuleStatus.PLANNED,
    color: 'blue',
    aiIntents: ["do'kon och", "mahsulot qo'sh", "do'konim"],
  },
  {
    id: 'ads',
    name: "E'lonlar",
    description: "Ko'chmas mulk, avto va boshqa e'lonlarni joylang.",
    href: '/ads',
    icon: Megaphone,
    category: ModuleCategory.COMMERCE,
    status: ModuleStatus.PLANNED,
    color: 'teal',
    quickOrder: 7,
    aiIntents: ["e'lon ber", "e'lon joyla", 'uy sotaman', 'mashina sotaman'],
  },
  {
    id: 'payments',
    name: "To'lovlar",
    description: "Kommunal, internet va mobil to'lovlar — bir joyda.",
    href: '/payments',
    icon: CreditCard,
    category: ModuleCategory.FINANCE,
    status: ModuleStatus.LIVE,
    color: 'orange',
    quickOrder: 4,
    aiIntents: ["kommunal to'la", "to'lov qil", "internet to'la", "telefon to'ldir"],
  },
  {
    id: 'wallet',
    name: 'Hamyon',
    description: "Balans, o'tkazmalar va cashback bitta hamyonda.",
    href: '/wallet',
    icon: Wallet,
    category: ModuleCategory.FINANCE,
    status: ModuleStatus.LIVE,
    color: 'green',
    aiIntents: ['balansim qancha', "pul o'tkaz", 'hamyon och', "hisobni to'ldir", 'balans'],
  },
  {
    id: 'jobs',
    name: 'Ish qidirish',
    description: 'Vakansiyalar, rezyume va tezkor arizalar.',
    href: '/jobs',
    icon: Briefcase,
    category: ModuleCategory.WORK,
    status: ModuleStatus.PLANNED,
    color: 'green',
    quickOrder: 5,
    aiIntents: ['ish top', 'vakansiya qidir', 'ishga joylash', 'rezyume'],
  },
  {
    id: 'business',
    name: 'Biznes kabinet',
    description: 'Buyurtmalar, hisobotlar va xodimlarni boshqaring.',
    href: '/business',
    icon: Building2,
    category: ModuleCategory.WORK,
    status: ModuleStatus.PLANNED,
    color: 'slate',
    aiIntents: ['biznes kabinet', 'savdolarim', "hisobot ko'r"],
  },
  {
    id: 'hotel',
    name: 'Mehmonxona',
    description: 'Xonalarni jonli narxlar bilan band qiling.',
    href: '/hotel',
    icon: Hotel,
    category: ModuleCategory.TRAVEL,
    status: ModuleStatus.PLANNED,
    color: 'violet',
    quickOrder: 8,
    aiIntents: ['mehmonxona band qil', 'xona top', 'nomer band qil'],
  },
  {
    id: 'travel',
    name: 'Sayohat',
    description: 'Aviachipta, poyezd va turlarni bitta oynada tanlang.',
    href: '/travel',
    icon: Plane,
    category: ModuleCategory.TRAVEL,
    status: ModuleStatus.PLANNED,
    color: 'sky',
    quickOrder: 9,
    aiIntents: ['chipta ol', 'sayohat rejalashtir', 'aviachipta', 'poyezd chiptasi'],
  },
  {
    id: 'ai-assistant',
    name: 'AI Yordamchi',
    description: "Gapiring — u kerakli modulni o'zi ishga tushiradi.",
    href: '/assistant',
    icon: Bot,
    category: ModuleCategory.PLATFORM,
    status: ModuleStatus.PLANNED,
    color: 'indigo',
    aiIntents: ['yordam ber', 'assistant', 'nima qila olasan'],
  },
  {
    id: 'maps',
    name: 'Xaritalar',
    description: 'Manzillar, marshrutlar va jonli kuzatuv.',
    href: '/maps',
    icon: Map,
    category: ModuleCategory.PLATFORM,
    status: ModuleStatus.PLANNED,
    color: 'teal',
    aiIntents: ['xarita och', 'manzil top', "yo'l ko'rsat"],
  },
  {
    id: 'chat',
    name: 'Chat',
    description: "Haydovchi, sotuvchi va qo'llab-quvvatlash bilan yozishing.",
    href: '/chat',
    icon: MessageCircle,
    category: ModuleCategory.PLATFORM,
    status: ModuleStatus.PLANNED,
    color: 'sky',
    aiIntents: ['chat och', 'xabar yoz', "operator bilan bog'la"],
  },
  {
    id: 'orders',
    name: 'Buyurtmalarim',
    description: 'Barcha modullardagi buyurtmalar yagona tarixda.',
    href: '/orders',
    icon: PackageSearch,
    category: ModuleCategory.PLATFORM,
    status: ModuleStatus.PLANNED,
    color: 'violet',
    aiIntents: ['buyurtmalarim', 'buyurtma holati', "tarix ko'rsat"],
  },
  {
    id: 'finance-hub',
    name: 'Moliya markazi',
    description: 'Xarajatlar tahlili va oylik moliyaviy hisobot.',
    href: '/finance',
    icon: Banknote,
    category: ModuleCategory.FINANCE,
    status: ModuleStatus.PLANNED,
    color: 'amber',
    aiIntents: ['xarajatlarim', 'moliyaviy hisobot', 'qancha sarfladim'],
  },
  {
    id: 'admin',
    name: 'Admin panel',
    description: 'Foydalanuvchilar, modullar va tizim monitoringi.',
    href: '/admin',
    icon: LayoutDashboard,
    category: ModuleCategory.PLATFORM,
    status: ModuleStatus.PLANNED,
    color: 'slate',
    aiIntents: ['admin panel', 'boshqaruv paneli'],
  },
  {
    id: 'security',
    name: 'Xavfsizlik',
    description: 'Ikki bosqichli kirish, qurilmalar va faollik jurnali.',
    href: '/security',
    icon: ShieldCheck,
    category: ModuleCategory.PLATFORM,
    status: ModuleStatus.PLANNED,
    color: 'rose',
    aiIntents: ['xavfsizlik', "parolni o'zgartir", 'qurilmalarim'],
  },
] as const;


/**
 * Bosh sahifadagi "Tezkor xizmatlar" to'ri uchun modullar.
 * `quickOrder` belgilanganlari, tartib bo'yicha.
 */
export function getQuickServices(): AppModule[] {
  return APP_MODULES.filter((module) => module.quickOrder !== undefined).sort(
    (a, b) => (a.quickOrder ?? 0) - (b.quickOrder ?? 0),
  );
}

/** Berilgan `id` bo'yicha modulni topadi. */
export function getModuleById(id: string): AppModule | undefined {
  return APP_MODULES.find((module) => module.id === id);
}

/** Guruh bo'yicha modullarni qaytaradi. */
export function getModulesByCategory(category: ModuleCategoryValue): AppModule[] {
  return APP_MODULES.filter((module) => module.category === category);
}

/**
 * AI Assistant uchun oddiy niyat (intent) qidiruvi.
 * Kelajakda LLM bilan almashtiriladi, hozircha kalit so'z bo'yicha ishlaydi.
 */
export function matchModuleByIntent(userText: string): AppModule | undefined {
  const normalized = userText.toLowerCase().trim();
  if (!normalized) return undefined;

  return APP_MODULES.find((module) =>
    module.aiIntents.some((intent) => normalized.includes(intent.toLowerCase())),
  );
}

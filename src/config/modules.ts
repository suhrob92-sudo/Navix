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
  'amber' | 'rose' | 'blue' | 'orange' | 'green' | 'pink' | 'teal' | 'violet' | 'sky' | 'indigo' | 'slate';

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
  /**
   * XIZMAT modulimi — oddiy foydalanuvchiga ko'rsatilmaydi.
   *
   * ── Nima uchun kerak ────────────────────────────────────────────────
   * Admin panel ham shu reyestrda turadi: uning manzili va nomi bir
   * joyda bo'lishi qulay. Lekin u ochiq sahifada, qidiruvda va AI
   * javoblarida chiqmasligi kerak.
   *
   * Bu xavfsizlik chorasi EMAS — panelning o'zi ruxsat bilan
   * himoyalangan. Bu shunchaki to'g'ri ko'rinish masalasi: mijozga
   * "Foydalanuvchilarni boshqarish" degan xizmatni taklif qilish
   * ma'nosiz va hujum yuzasini bekorga e'lon qiladi.
   */
  isInternal?: boolean;
  /**
   * Administrator bu bo'limni VAQTINCHA yopa oladimi.
   *
   * ── Nima uchun hammasi emas ─────────────────────────────────────────
   * Ba'zi bo'limlarni yopish ilovani ishlamas holga keltiradi:
   *
   *  · hamyon — barcha to'lovlar undan o'tadi;
   *  · buyurtmalar — odam yopilgan bo'lim tufayli o'z buyurtmasini
   *    ko'ra olmay qolardi;
   *  · xavfsizlik — parol o'zgartirish va sessiyalar shu yerda;
   *  · admin paneli — yopgan odam o'zini qulflab qo'yardi.
   *
   * Shuning uchun yopish faqat MUSTAQIL xizmatlarga ruxsat etiladi:
   * ular ishlamasa ham odam ilovadan foydalanaverdi.
   */
  canDisable?: boolean;
  /**
   * Shu bo'limga tegishli API manzillari (`/api/v1/` dan keyingi qism).
   *
   * Bo'lim yopilganda kartochkani yashirish YETARLI EMAS: manzilni
   * qo'lda yozgan yoki eski sahifasi ochiq qolgan odam baribir
   * buyurtma bera olardi. Shuning uchun so'rov API darajasida
   * to'xtatiladi va aynan shu ro'yxat orqali topiladi.
   */
  apiPrefixes?: readonly string[];
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
    aiIntents: [
      'taxi chaqir',
      'taksi chaqir',
      'taksi',
      'mashina chaqir',
      'taksi buyurtma',
      'meni olib ket',
      'mashina kerak',
    ],
  },
  {
    id: 'courier',
    name: 'Kuryer',
    description: 'Buyurtmalarni yetkazing va har topshiriq uchun haq oling.',
    href: '/courier',
    icon: Package,
    category: ModuleCategory.MOBILITY,
    /**
     * 17-bosqichda ishga tushdi.
     *
     * Bu modul MIJOZ uchun emas, KURYER uchun: u ovqat va Marketplace
     * buyurtmalarini yetkazadi. Shuning uchun `quickOrder` yo'q —
     * bosh sahifadagi tezkor xizmatlar mijozga mo'ljallangan.
     */
    status: ModuleStatus.LIVE,
    color: 'indigo',
    aiIntents: ['kuryer kabineti', 'topshiriqlarim', 'yetkazishlarim'],
  },
  {
    id: 'delivery',
    name: 'Yetkazib berish',
    description: "Viloyatlararo yuk va posilkalarni kuzatuv bilan jo'nating.",
    href: '/delivery',
    icon: Bus,
    category: ModuleCategory.MOBILITY,
    status: ModuleStatus.LIVE,
    color: 'pink',
    quickOrder: 6,
    aiIntents: ["yuk jo'nat", 'posilka yubor', 'yetkazib berish'],
    canDisable: true,
    apiPrefixes: ['parcels'],
  },
  {
    id: 'food',
    name: 'Ovqat yetkazish',
    description: 'Yaqin atrofdagi restoranlardan issiq ovqat buyurtma qiling.',
    href: '/food',
    icon: UtensilsCrossed,
    category: ModuleCategory.COMMERCE,
    status: ModuleStatus.LIVE,
    color: 'rose',
    quickOrder: 2,
    aiIntents: ['ovqat buyurtma qil', 'pizza buyurtma qil', 'ovqat yetkaz', 'och qoldim'],
    canDisable: true,
    apiPrefixes: ['food'],
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    description: 'Minglab sotuvchilar bitta savdo maydonchasida.',
    href: '/marketplace',
    icon: Store,
    category: ModuleCategory.COMMERCE,
    status: ModuleStatus.LIVE,
    color: 'blue',
    quickOrder: 3,
    aiIntents: ['mahsulot qidir', 'marketplace och', 'sotib olmoqchiman'],
    canDisable: true,
    apiPrefixes: ['market'],
  },
  {
    id: 'shop',
    name: 'Sotuvchi kabineti',
    description: "O'z do'koningizni oching: mahsulot, ombor va buyurtmalar.",
    href: '/seller',
    icon: ShoppingBag,
    category: ModuleCategory.COMMERCE,
    /** 16-bosqichda ishga tushdi. */
    status: ModuleStatus.LIVE,
    color: 'blue',
    aiIntents: ["do'konim", "mahsulot qo'sh", 'ombor', 'sotuvchi kabineti'],
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
    canDisable: true,
    apiPrefixes: ['payments'],
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
    description: 'Vakansiyalar, qidiruv va tezkor ariza.',
    href: '/jobs',
    icon: Briefcase,
    category: ModuleCategory.WORK,
    /** 19-bosqichda ishga tushdi. */
    status: ModuleStatus.LIVE,
    color: 'green',
    quickOrder: 5,
    aiIntents: ['ish top', 'vakansiya qidir', 'ishga joylash', 'rezyume'],
    canDisable: true,
    apiPrefixes: ['jobs'],
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
    status: ModuleStatus.LIVE,
    color: 'violet',
    quickOrder: 7,
    aiIntents: ['mehmonxona band qil', 'xona top', 'nomer band qil'],
    canDisable: true,
    apiPrefixes: ['hotels'],
  },
  {
    id: 'travel',
    name: 'Sayohat',
    description: 'Samolyot, poyezd va avtobus chiptalari bitta qidiruvda.',
    href: '/travel',
    icon: Plane,
    category: ModuleCategory.TRAVEL,
    /** 23-bosqichda ishga tushdi. */
    status: ModuleStatus.LIVE,
    color: 'sky',
    quickOrder: 8,
    aiIntents: [
      'chipta ol',
      'chipta',
      'sayohat rejalashtir',
      'aviachipta',
      'poyezd chiptasi',
      'avtobus chiptasi',
      'reys qidir',
      'samolyot',
    ],
    canDisable: true,
    apiPrefixes: ['travel'],
  },
  {
    id: 'ai-assistant',
    name: 'AI Yordamchi',
    description: "Gapiring — u kerakli modulni o'zi ishga tushiradi.",
    href: '/assistant',
    icon: Bot,
    category: ModuleCategory.PLATFORM,
    status: ModuleStatus.LIVE,
    color: 'indigo',
    aiIntents: ['yordam ber', 'assistant', 'nima qila olasan'],
    canDisable: true,
    apiPrefixes: ['assistant'],
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
    name: 'Xabarlar',
    description: "Yozishmalar, ovozli xabar va qo'ng'iroqlar.",
    /**
     * Manzil `/messages` — `/chat` EMAS.
     *
     * Reyestrda `/chat` yozilgan edi, lekin bunday sahifa hech qachon
     * bo'lmagan: suhbatlar boshidan `/messages` da qurilgan. Ya'ni
     * qidiruvdan bosilgan har bir havola 404 ga olib borardi.
     */
    href: '/messages',
    icon: MessageCircle,
    category: ModuleCategory.PLATFORM,
    status: ModuleStatus.LIVE,
    color: 'sky',
    aiIntents: ['chat och', 'xabar yoz', 'xabarlarim', 'suhbat och', "operator bilan bog'la"],
  },
  {
    id: 'orders',
    name: 'Buyurtmalarim',
    description: 'Ovqat, xarid, mehmonxona, chipta va posilka — bitta tarixda.',
    href: '/orders',
    icon: PackageSearch,
    category: ModuleCategory.PLATFORM,
    status: ModuleStatus.LIVE,
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
    status: ModuleStatus.LIVE,
    color: 'slate',
    aiIntents: ['admin panel', 'boshqaruv paneli'],
    isInternal: true,
  },
  {
    id: 'security',
    name: 'Xavfsizlik',
    description: 'Ikki bosqichli kirish, qurilmalar va faollik jurnali.',
    href: '/security',
    icon: ShieldCheck,
    category: ModuleCategory.PLATFORM,
    status: ModuleStatus.LIVE,
    color: 'rose',
    aiIntents: ['xavfsizlik', "parolni o'zgartir", 'qurilmalarim'],
  },
] as const;

/**
 * Foydalanuvchiga KO'RSATILADIGAN modullar.
 *
 * Xizmat modullari (admin panel) chiqarib tashlanadi. Barcha ro'yxatlar
 * — ochiq sahifa, qidiruv, AI javoblari — shu funksiyadan oziqlanishi
 * kerak, aks holda birortasida admin paneli chiqib qolardi.
 */
export function getPublicModules(): AppModule[] {
  return APP_MODULES.filter((module) => !module.isInternal);
}

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

/** Guruh bo'yicha modullarni qaytaradi (xizmat modullarisiz). */
export function getModulesByCategory(category: ModuleCategoryValue): AppModule[] {
  return getPublicModules().filter((module) => module.category === category);
}

/**
 * AI Assistant uchun oddiy niyat (intent) qidiruvi.
 * Kelajakda LLM bilan almashtiriladi, hozircha kalit so'z bo'yicha ishlaydi.
 */
export function matchModuleByIntent(userText: string): AppModule | undefined {
  const normalized = userText.toLowerCase().trim();
  if (!normalized) return undefined;

  /**
   * Xizmat modullari qidirilmaydi.
   *
   * Aks holda "admin panel" deb yozgan har qanday odamga yordamchi
   * havola berardi. Panelning o'zi ruxsat so'raydi, lekin uni taklif
   * qilishning ma'nosi yo'q.
   */
  return getPublicModules().find((module) =>
    module.aiIntents.some((intent) => normalized.includes(intent.toLowerCase())),
  );
}

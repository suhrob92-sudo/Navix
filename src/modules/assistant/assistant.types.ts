/**
 * AI Yordamchi bilan almashinadigan ma'lumot turlari.
 *
 * ── Nima uchun holat MIJOZDA saqlanadi ────────────────────────────────
 * Suhbat ko'p qadamli bo'lishi mumkin: "gazga to'la" → "qaysi hisobga?"
 * → "1234567890" → "qancha?" → "50 ming". Server bu oraliq holatni
 * saqlashi uchun sessiya kerak bo'lardi.
 *
 * Buning o'rniga holat javob bilan qaytariladi va keyingi so'rovda
 * qaytib keladi. Server holatsiz (stateless) qoladi — bir nechta
 * nusxada ishlatish oson va Redis'da suhbat saqlash shart emas.
 *
 * Xavfsizlik: holatda FAQAT tanlov ma'lumoti bo'ladi. Pul harakati
 * har doim serverda qaytadan tekshiriladi (`/api/v1/payments`,
 * `/api/v1/wallet/transfer`), shuning uchun holatni o'zgartirib
 * chegaralarni chetlab o'tib bo'lmaydi.
 */

export interface AssistantSlots {
  /** Summa SO'MDA. */
  amountSom?: number;
  /** Xizmat provayderi ID'si. */
  providerId?: string;
  /** Xizmat nomi — matnda ko'rsatish uchun. */
  providerName?: string;
  /** Kommunal hisob yoki shartnoma raqami. */
  accountNumber?: string;
  /** O'tkazma qabul qiluvchisi. */
  phone?: string;
  recipientName?: string;

  /**
   * Tanlangan taom — foydalanuvchi variantlardan birini bosmaguncha
   * saqlanadigan ro'yxat.
   *
   * Bu yerdagi narx faqat MATNDA ko'rsatish uchun. Buyurtma yaratilganda
   * `createFoodOrder()` narxni bazadan qaytadan o'qiydi, shuning uchun
   * holatni tahrirlab arzonga ovqat olib bo'lmaydi.
   */
  foodOptions?: FoodOptionSlot[];
  /** Tanlangan taom ID'si. */
  menuItemId?: string;
  /** Nechta dona. */
  quantity?: number;
}

/** Ro'yxatdan tanlash uchun saqlanadigan variant. */
export interface FoodOptionSlot {
  menuItemId: string;
  name: string;
  restaurantName: string;
  priceSom: number;
}

export interface AssistantState {
  /** Boshlangan, lekin tugallanmagan buyruq. */
  intent?: string;
  slots: AssistantSlots;
}

/**
 * Yordamchi taklif qiladigan amal.
 *
 * MUHIM: `confirm_*` turlari pulni O'ZI harakatlantirmaydi. Ular faqat
 * "tayyorlangan buyruq" — foydalanuvchi tasdiqlaganidan keyingina mijoz
 * odatdagi endpointga so'rov yuboradi. Shu sababli barcha tekshiruvlar
 * (chegara, balans, idempotentlik) o'z joyida ishlaydi.
 */
export type AssistantAction =
  | { kind: 'none' }
  | { kind: 'navigate'; href: string; label: string }
  | {
      kind: 'confirm_payment';
      providerId: string;
      providerName: string;
      accountNumber: string;
      amountSom: number;
    }
  | { kind: 'confirm_transfer'; phone: string; recipientName: string; amountSom: number }
  | { kind: 'confirm_topup'; amountSom: number; method: 'CARD' }
  | {
      kind: 'confirm_food_order';
      restaurantId: string;
      restaurantName: string;
      addressId: string;
      addressLine: string;
      itemName: string;
      menuItemId: string;
      quantity: number;
      /** Taomlar narxi — yetkazishsiz. */
      subtotalSom: number;
      deliveryFeeSom: number;
      /** Hamyondan yechiladigan yakuniy summa. */
      amountSom: number;
      deliveryMinutes: number;
    };

export interface AssistantReply {
  /** Yordamchining javob matni. */
  text: string;
  /** Tugma sifatida ko'rsatiladigan tayyor javoblar. */
  suggestions: string[];
  action: AssistantAction;
  /** Keyingi so'rovda qaytariladigan holat. */
  state: AssistantState;
}

export interface AssistantRequestBody {
  message: string;
  state?: AssistantState;
}

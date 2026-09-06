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

  /**
   * Marketplace variantlari — ovqatdan ALOHIDA saqlanadi.
   *
   * Bitta ro'yxatga qo'shib yuborish mumkin edi, lekin unda "2-chi"
   * degan tanlov qaysi katalogga tegishli ekani noaniq bo'lardi.
   */
  productOptions?: MarketOptionSlot[];
  /** Tanlangan mahsulot ID'si. */
  productId?: string;
}

/** Ro'yxatdan tanlash uchun saqlanadigan variant (ovqat). */
export interface FoodOptionSlot {
  menuItemId: string;
  name: string;
  restaurantName: string;
  priceSom: number;
}

/** Ro'yxatdan tanlash uchun saqlanadigan variant (marketplace). */
export interface MarketOptionSlot {
  productId: string;
  name: string;
  shopName: string;
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
    }
  | {
      kind: 'confirm_market_order';
      shopId: string;
      shopName: string;
      addressId: string;
      addressLine: string;
      itemName: string;
      productId: string;
      quantity: number;
      /** Mahsulotlar narxi — yetkazishsiz. */
      subtotalSom: number;
      deliveryFeeSom: number;
      /** Hamyondan yechiladigan yakuniy summa. */
      amountSom: number;
      deliveryDays: number;
    }
  | {
      /**
       * Taksi buyurtmasi — TASDIQ kutmoqda.
       *
       * Boshqa `confirm_*` lar bilan bir xil qoida: bu yerda hech
       * qanday safar yaratilmaydi va pul yechilmaydi. Foydalanuvchi
       * tugmani bosgandan keyingina mijoz odatdagi
       * `POST /api/v1/taxi/rides` ga so'rov yuboradi va narx
       * serverda QAYTADAN hisoblanadi.
       */
      kind: 'confirm_taxi_order';
      tariff: 'ECONOM' | 'COMFORT';
      tariffLabel: string;
      fromLat: number;
      fromLng: number;
      fromAddress: string;
      toLat: number;
      toLng: number;
      toAddress: string;
      distanceKm: number;
      /** Taxminiy safar vaqti — DAQIQADA. */
      minutes: number;
      /** Hamyondan yechiladigan summa. */
      amountSom: number;
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

/**
 * Foydalanuvchining HOZIRGI joylashuvi.
 *
 * ── Nima uchun BRAUZERDAN keladi ──────────────────────────────────────
 * Server foydalanuvchi qayerdaligini bilmaydi: IP manzil shahar
 * darajasida ham noto'g'ri bo'lishi mumkin (mobil operator, VPN).
 * Aniq nuqtani faqat telefonning o'zi biladi.
 *
 * Shuning uchun u so'rov bilan yuboriladi. Ixtiyoriy: ruxsat
 * berilmagan bo'lsa ham yordamchining qolgan hamma buyrug'i
 * ishlayveradi.
 */
export interface AssistantLocation {
  latitude: number;
  longitude: number;
}

export interface AssistantRequestBody {
  message: string;
  state?: AssistantState;
  location?: AssistantLocation;
}

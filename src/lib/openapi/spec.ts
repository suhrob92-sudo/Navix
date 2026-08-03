import { siteConfig } from '@/config/site';

/**
 * OpenAPI 3.1 spetsifikatsiyasi — API'ning rasmiy hujjati.
 *
 * Nima uchun kerak:
 *  - Frontend va mobil dasturchilar API'ni o'qib tushunadi;
 *  - Postman / Insomnia'ga import qilib sinash mumkin;
 *  - Kelajakda tayyor client kod generatsiya qilinadi.
 *
 * Yangi endpoint qo'shganda shu faylga ham yozuv qo'shiladi.
 */

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: `${siteConfig.name} API`,
    version: '0.1.0',
    description:
      'Navix super ilovasining ochiq API hujjati. Barcha javoblar yagona formatda (envelope) qaytadi: `success`, `data` yoki `error`, va `meta`.',
    contact: { name: "Navix qo'llab-quvvatlash", email: siteConfig.supportEmail },
  },
  servers: [
    { url: siteConfig.url, description: 'Joriy muhit' },
    { url: 'http://localhost:3000', description: 'Lokal ishlab chiqish' },
  ],
  tags: [
    { name: 'System', description: "Tizim holati va xizmat ko'rsatuvchi endpointlar" },
    { name: 'Auth', description: "Ro'yxatdan o'tish, kirish va sessiyalar" },
    { name: 'Profile', description: 'Profil va sozlamalar' },
    { name: 'Addresses', description: 'Saqlangan manzillar (barcha modullar uchun umumiy)' },
    { name: 'Notifications', description: 'Bildirishnomalar' },
    { name: 'Wallet', description: "Hamyon: balans, to'ldirish va o'tkazmalar" },
    { name: 'Payments', description: "Xizmat to'lovlari: kommunal, internet, mobil aloqa, TV" },
    { name: 'Assistant', description: 'AI Yordamchi — matndan buyruq tayyorlaydi' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token `Authorization: Bearer <token>` sarlavhasida yuboriladi.',
      },
    },
    schemas: {
      ApiMeta: {
        type: 'object',
        required: ['requestId', 'timestamp'],
        properties: {
          requestId: { type: 'string', description: "So'rovni kuzatish uchun noyob ID" },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      ApiError: {
        type: 'object',
        required: ['success', 'error', 'meta'],
        properties: {
          success: { type: 'boolean', enum: [false] },
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: {
                type: 'string',
                enum: [
                  'VALIDATION_ERROR',
                  'UNAUTHORIZED',
                  'FORBIDDEN',
                  'NOT_FOUND',
                  'CONFLICT',
                  'RATE_LIMITED',
                  'INTERNAL_ERROR',
                  'SERVICE_UNAVAILABLE',
                ],
              },
              message: { type: 'string' },
              details: {
                type: 'object',
                additionalProperties: { type: 'array', items: { type: 'string' } },
                description: "Maydonlar bo'yicha validatsiya xatoliklari",
              },
            },
          },
          meta: { $ref: '#/components/schemas/ApiMeta' },
        },
      },
      DependencyCheck: {
        type: 'object',
        required: ['status', 'latencyMs'],
        properties: {
          status: { type: 'string', enum: ['ok', 'error'] },
          latencyMs: { type: 'integer', description: 'Javob vaqti (millisekund)' },
          error: { type: 'string' },
        },
      },
      HealthPayload: {
        type: 'object',
        required: ['status', 'uptimeSeconds', 'dependencies'],
        properties: {
          status: { type: 'string', enum: ['healthy', 'degraded'] },
          uptimeSeconds: { type: 'integer' },
          dependencies: {
            type: 'object',
            required: ['database', 'redis'],
            properties: {
              database: { $ref: '#/components/schemas/DependencyCheck' },
              redis: { $ref: '#/components/schemas/DependencyCheck' },
            },
          },
        },
      },
      HealthResponse: {
        type: 'object',
        required: ['success', 'data', 'meta'],
        properties: {
          success: { type: 'boolean', enum: [true] },
          data: { $ref: '#/components/schemas/HealthPayload' },
          meta: { $ref: '#/components/schemas/ApiMeta' },
        },
      },

      // --- Autentifikatsiya ---------------------------------------------
      Phone: {
        type: 'string',
        description:
          "O'zbekiston telefon raqami. Istalgan ko'rinishda yuborish mumkin — server E.164 formatga o'zi keltiradi.",
        examples: ['+998901234567', '90 123 45 67'],
      },
      OtpCode: {
        type: 'string',
        pattern: '^\\d{6}$',
        description: 'SMS orqali kelgan 6 xonali kod',
        examples: ['123456'],
      },
      AuthUser: {
        type: 'object',
        required: ['id', 'phone', 'status', 'roles'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          phone: { type: 'string' },
          firstName: { type: ['string', 'null'] },
          lastName: { type: ['string', 'null'] },
          avatarUrl: { type: ['string', 'null'] },
          status: { type: 'string', enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'] },
          roles: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['CUSTOMER', 'DRIVER', 'COURIER', 'MERCHANT', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN'],
            },
          },
        },
      },
      OtpIssued: {
        type: 'object',
        required: ['expiresInSeconds', 'resendAfterSeconds'],
        properties: {
          phone: { type: 'string' },
          expiresInSeconds: { type: 'integer', description: 'Kod qancha vaqt amal qiladi' },
          resendAfterSeconds: { type: 'integer', description: 'Qayta yuborishgacha kutish vaqti' },
        },
      },
      AuthSession: {
        type: 'object',
        required: ['accessToken', 'expiresInSeconds', 'user'],
        properties: {
          accessToken: {
            type: 'string',
            description:
              "JWT access token. Keyingi so'rovlarda `Authorization: Bearer <token>` sarlavhasida yuboriladi. Refresh token esa httpOnly cookie'da qaytadi.",
          },
          expiresInSeconds: { type: 'integer' },
          user: { $ref: '#/components/schemas/AuthUser' },
        },
      },
      SessionSummary: {
        type: 'object',
        required: ['id', 'isCurrent'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          deviceLabel: { type: ['string', 'null'], examples: ['Chrome / Windows'] },
          ipAddress: { type: ['string', 'null'] },
          lastUsedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
          isCurrent: { type: 'boolean', description: 'Foydalanuvchi hozir shu qurilmadan kirgan' },
        },
      },

      // --- Profil ---------------------------------------------------------
      ProfilePreferences: {
        type: 'object',
        required: ['language', 'theme', 'timezone', 'marketingOptIn'],
        properties: {
          dateOfBirth: { type: ['string', 'null'], format: 'date-time' },
          language: { type: 'string', enum: ['UZ', 'RU', 'EN'] },
          theme: { type: 'string', enum: ['LIGHT', 'DARK', 'SYSTEM'] },
          timezone: { type: 'string', examples: ['Asia/Tashkent'] },
          marketingOptIn: { type: 'boolean', description: 'Aksiya xabarlariga rozilik' },
        },
      },
      Profile: {
        type: 'object',
        required: ['id', 'phone', 'status', 'roles', 'preferences'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          phone: { type: 'string' },
          email: { type: ['string', 'null'] },
          firstName: { type: ['string', 'null'] },
          lastName: { type: ['string', 'null'] },
          avatarUrl: { type: ['string', 'null'] },
          status: { type: 'string' },
          phoneVerified: { type: ['string', 'null'], format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          roles: { type: 'array', items: { type: 'string' } },
          preferences: { $ref: '#/components/schemas/ProfilePreferences' },
        },
      },

      // --- Manzillar ------------------------------------------------------
      ServiceProvider: {
        type: 'object',
        required: ['id', 'code', 'name', 'category', 'accountLabel', 'minAmount', 'maxAmount'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          code: { type: 'string', examples: ['hududgaz'] },
          name: { type: 'string', examples: ['Hududgaz'] },
          category: { type: 'string', enum: ['UTILITY', 'INTERNET', 'MOBILE', 'TV'] },
          description: { type: ['string', 'null'] },
          accountLabel: {
            type: 'string',
            description: 'Hisob raqami maydonining nomi.',
            examples: ['Shaxsiy hisob raqami'],
          },
          accountHint: { type: 'string', examples: ['1234567890'] },
          minAmount: { type: 'integer', description: 'Eng kam summa, TIYINDA.' },
          maxAmount: { type: 'integer', description: "Eng ko'p summa, TIYINDA." },
          color: { type: 'string', examples: ['orange'] },
        },
      },
      SavedAccount: {
        type: 'object',
        required: ['id', 'accountNumber', 'label', 'provider'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          accountNumber: { type: 'string', examples: ['1234567890'] },
          label: { type: 'string', examples: ['Uy gazi'] },
          provider: { $ref: '#/components/schemas/ServiceProvider' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ServicePayment: {
        type: 'object',
        required: ['id', 'accountNumber', 'amount', 'status', 'receiptNumber', 'provider'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          accountNumber: { type: 'string' },
          amount: { type: 'integer', description: 'Summa TIYINDA.' },
          status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'] },
          receiptNumber: { type: 'string', examples: ['NVX-20260803-F9A31Q'] },
          failureReason: { type: ['string', 'null'] },
          provider: { $ref: '#/components/schemas/ServiceProvider' },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: ['string', 'null'], format: 'date-time' },
        },
      },
      CreatePaymentInput: {
        type: 'object',
        required: ['providerId', 'accountNumber', 'amount', 'idempotencyKey'],
        properties: {
          providerId: { type: 'string', format: 'uuid' },
          accountNumber: {
            type: 'string',
            description: "Provayder naqshiga mos bo'lishi kerak (server tekshiradi).",
          },
          amount: { type: 'integer', description: "Summa SO'MDA. Chegara provayderga qarab tekshiriladi." },
          saveAccount: { type: 'boolean', default: false },
          accountLabel: { type: 'string', maxLength: 60 },
          idempotencyKey: { type: 'string', minLength: 8, maxLength: 100 },
        },
      },
      WalletTransaction: {
        type: 'object',
        required: ['id', 'type', 'status', 'amount', 'balanceAfter', 'direction'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: {
            type: 'string',
            enum: ['TOP_UP', 'WITHDRAWAL', 'PAYMENT', 'REFUND', 'TRANSFER', 'BONUS'],
          },
          status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'] },
          amount: {
            type: 'integer',
            description: "Summa TIYINDA, har doim musbat. 1 so'm = 100 tiyin.",
            examples: [5000000],
          },
          balanceAfter: { type: 'integer', description: 'Amaldan keyingi balans, tiyinda.' },
          direction: {
            type: 'string',
            enum: ['in', 'out'],
            description: '`in` — hamyonga kirdi, `out` — hamyondan chiqdi.',
          },
          description: { type: ['string', 'null'] },
          sourceModule: { type: 'string', examples: ['wallet'] },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: ['string', 'null'], format: 'date-time' },
        },
      },
      WalletSummary: {
        type: 'object',
        required: ['id', 'balance', 'reserved', 'available', 'currency', 'status'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          balance: { type: 'integer', description: 'Umumiy balans, tiyinda.' },
          reserved: { type: 'integer', description: 'Buyurtmalar uchun band qilingan summa, tiyinda.' },
          available: { type: 'integer', description: "`balance - reserved` — sarflash mumkin bo'lgan summa." },
          currency: { type: 'string', examples: ['UZS'] },
          status: { type: 'string', enum: ['ACTIVE', 'FROZEN', 'CLOSED'] },
          recentTransactions: {
            type: 'array',
            items: { $ref: '#/components/schemas/WalletTransaction' },
          },
        },
      },
      TopUpInput: {
        type: 'object',
        required: ['amount', 'method', 'idempotencyKey'],
        properties: {
          amount: {
            type: 'integer',
            minimum: 1000,
            maximum: 10000000,
            description: "Summa SO'MDA (tiyinda emas).",
            examples: [50000],
          },
          method: { type: 'string', enum: ['CARD', 'PAYME', 'CLICK', 'UZUM'] },
          idempotencyKey: {
            type: 'string',
            minLength: 8,
            maxLength: 100,
            description:
              "Takroriy so'rovdan himoya. Bir xil kalit bilan kelgan ikkinchi so'rov yangi amal yaratmaydi.",
          },
        },
      },
      TransferInput: {
        type: 'object',
        required: ['phone', 'amount', 'idempotencyKey'],
        properties: {
          phone: { type: 'string', examples: ['+998901234567'] },
          amount: { type: 'integer', minimum: 1000, maximum: 10000000, description: "Summa SO'MDA." },
          note: { type: 'string', maxLength: 140 },
          idempotencyKey: { type: 'string', minLength: 8, maxLength: 100 },
        },
      },
      TransferRecipient: {
        type: 'object',
        required: ['name', 'isSelf'],
        properties: {
          name: { type: 'string', description: 'Faqat ism qaytariladi — boshqa maʼlumot berilmaydi.' },
          isSelf: { type: 'boolean' },
        },
      },
      Address: {
        type: 'object',
        required: ['id', 'type', 'label', 'city', 'street', 'latitude', 'longitude', 'isDefault'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['HOME', 'WORK', 'OTHER'] },
          label: { type: 'string', examples: ['Uyim'] },
          country: { type: 'string', examples: ['UZ'] },
          city: { type: 'string', examples: ['Toshkent'] },
          district: { type: ['string', 'null'] },
          street: { type: 'string' },
          building: { type: ['string', 'null'] },
          apartment: { type: ['string', 'null'] },
          postalCode: { type: ['string', 'null'] },
          latitude: { type: 'number', examples: [41.2995] },
          longitude: { type: 'number', examples: [69.2401] },
          notes: { type: ['string', 'null'], description: "Domofon kodi, mo'ljal" },
          isDefault: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AddressInput: {
        type: 'object',
        required: ['label', 'city', 'street', 'latitude', 'longitude'],
        properties: {
          type: { type: 'string', enum: ['HOME', 'WORK', 'OTHER'], default: 'OTHER' },
          label: { type: 'string', minLength: 2, maxLength: 60 },
          city: { type: 'string', minLength: 2, maxLength: 100 },
          district: { type: ['string', 'null'], maxLength: 100 },
          street: { type: 'string', minLength: 2, maxLength: 200 },
          building: { type: ['string', 'null'], maxLength: 50 },
          apartment: { type: ['string', 'null'], maxLength: 50 },
          postalCode: { type: ['string', 'null'], maxLength: 20 },
          latitude: { type: 'number', minimum: -90, maximum: 90 },
          longitude: { type: 'number', minimum: -180, maximum: 180 },
          notes: { type: ['string', 'null'], maxLength: 255 },
          isDefault: { type: 'boolean', default: false },
        },
      },

      // --- Bildirishnomalar -----------------------------------------------
      Notification: {
        type: 'object',
        required: ['id', 'title', 'body', 'sourceModule', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          channel: { type: 'string', enum: ['IN_APP', 'PUSH', 'SMS', 'EMAIL'] },
          status: { type: 'string', enum: ['QUEUED', 'SENT', 'READ', 'FAILED'] },
          title: { type: 'string' },
          body: { type: 'string' },
          actionUrl: { type: ['string', 'null'] },
          sourceModule: { type: 'string', description: 'Xabarni yuborgan modul', examples: ['taxi'] },
          createdAt: { type: 'string', format: 'date-time' },
          readAt: { type: ['string', 'null'], format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Tizim salomatligini tekshirish',
        description:
          "Ma'lumotlar bazasi va Redis bilan ulanishni tekshiradi. Monitoring tizimlari uchun mo'ljallangan.",
        operationId: 'getHealth',
        security: [],
        responses: {
          '200': {
            description: 'Barcha xizmatlar ishlayapti',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
          },
          '503': {
            description: "Bog'liqliklardan biri ishlamayapti",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
          },
        },
      },
    },

    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: "Ro'yxatdan o'tish",
        description:
          "Yangi hisob yaratadi va telefon raqamiga 6 xonali kod yuboradi. Hisob faqat kod tasdiqlangach faollashadi. Cheklov: bir IP'dan soatiga 5 marta.",
        operationId: 'register',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone', 'password', 'firstName'],
                properties: {
                  phone: { $ref: '#/components/schemas/Phone' },
                  password: { type: 'string', minLength: 8, description: 'Kamida bitta harf va bitta raqam' },
                  firstName: { type: 'string', minLength: 2, maxLength: 100 },
                  lastName: { type: 'string', minLength: 2, maxLength: 100 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Hisob yaratildi, kod yuborildi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/OtpIssued' } } },
          },
          '400': {
            description: "Ma'lumot noto'g'ri",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
          '409': {
            description: "Bu raqam allaqachon ro'yxatdan o'tgan",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
          '429': {
            description: "So'rovlar chegarasi oshdi",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },

    '/api/v1/auth/verify-otp': {
      post: {
        tags: ['Auth'],
        summary: 'SMS kodni tasdiqlash',
        description:
          "Kod to'g'ri bo'lsa hisob faollashadi, CUSTOMER roli beriladi, hamyon ochiladi va token beriladi.",
        operationId: 'verifyOtp',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone', 'code'],
                properties: {
                  phone: { $ref: '#/components/schemas/Phone' },
                  code: { $ref: '#/components/schemas/OtpCode' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Tasdiqlandi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthSession' } } },
            headers: {
              'Set-Cookie': {
                description: 'httpOnly refresh token cookie',
                schema: { type: 'string' },
              },
            },
          },
          '400': {
            description: "Kod noto'g'ri yoki muddati tugagan",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },

    '/api/v1/auth/resend-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Tasdiqlash kodini qayta yuborish',
        description:
          "Xavfsizlik uchun raqam tizimda bo'lmasa ham muvaffaqiyatli javob qaytadi. Cheklov: bir raqamga soatiga 5 marta.",
        operationId: 'resendOtp',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone'],
                properties: { phone: { $ref: '#/components/schemas/Phone' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Kod yuborildi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/OtpIssued' } } },
          },
          '429': {
            description: "So'rovlar chegarasi oshdi",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },

    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Tizimga kirish',
        description:
          'Cheklov: bir raqam uchun 15 daqiqada 10 marta. Muvaffaqiyatli kirishda hisoblagich tozalanadi.',
        operationId: 'login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone', 'password'],
                properties: {
                  phone: { $ref: '#/components/schemas/Phone' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Kirildi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthSession' } } },
          },
          '401': {
            description: "Raqam yoki parol noto'g'ri, yoki hisob faol emas",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
          '429': {
            description: "So'rovlar chegarasi oshdi",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },

    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Access token yangilash',
        description:
          "Refresh token cookie'dan olinadi. Har yangilashda refresh token ham almashtiriladi (token rotation).",
        operationId: 'refreshToken',
        security: [],
        responses: {
          '200': {
            description: 'Yangi token berildi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['accessToken', 'expiresInSeconds'],
                  properties: {
                    accessToken: { type: 'string' },
                    expiresInSeconds: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Sessiya topilmadi yoki muddati tugagan',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },

    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Tizimdan chiqish',
        description: 'Joriy sessiyani bekor qiladi. Boshqa qurilmalar ishlashda davom etadi.',
        operationId: 'logout',
        responses: {
          '200': {
            description: 'Chiqildi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { loggedOut: { type: 'boolean' } },
                },
              },
            },
          },
        },
      },
    },

    '/api/v1/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Joriy foydalanuvchi',
        description: "Rollar bazadan o'qiladi — token berilgandan keyin o'zgargan bo'lishi mumkin.",
        operationId: 'getMe',
        responses: {
          '200': {
            description: 'Foydalanuvchi va uning ruxsatlari',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['user', 'permissions', 'sessionId'],
                  properties: {
                    user: { $ref: '#/components/schemas/AuthUser' },
                    permissions: { type: 'array', items: { type: 'string' } },
                    sessionId: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Avtorizatsiya talab qilinadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },

    '/api/v1/auth/password/forgot': {
      post: {
        tags: ['Auth'],
        summary: "Parolni tiklash uchun kod so'rash",
        description:
          "Raqam tizimda bo'lmasa ham muvaffaqiyatli javob qaytadi (user enumeration himoyasi). Cheklov: soatiga 3 marta.",
        operationId: 'forgotPassword',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone'],
                properties: { phone: { $ref: '#/components/schemas/Phone' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: "So'rov qabul qilindi",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/OtpIssued' } } },
          },
        },
      },
    },

    '/api/v1/auth/password/reset': {
      post: {
        tags: ['Auth'],
        summary: "Yangi parol o'rnatish",
        description: "Parol o'zgargach BARCHA qurilmalardagi sessiyalar bekor qilinadi.",
        operationId: 'resetPassword',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone', 'code', 'password'],
                properties: {
                  phone: { $ref: '#/components/schemas/Phone' },
                  code: { $ref: '#/components/schemas/OtpCode' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Parol yangilandi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    passwordChanged: { type: 'boolean' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': {
            description: "Kod noto'g'ri yoki muddati tugagan",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },

    '/api/v1/auth/sessions': {
      get: {
        tags: ['Auth'],
        summary: 'Faol qurilmalar',
        operationId: 'listSessions',
        responses: {
          '200': {
            description: 'Faol sessiyalar',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sessions: { type: 'array', items: { $ref: '#/components/schemas/SessionSummary' } },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Avtorizatsiya talab qilinadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
      delete: {
        tags: ['Auth'],
        summary: 'Boshqa qurilmalardan chiqish',
        description: 'Joriy qurilmadan tashqari barcha sessiyalarni bekor qiladi.',
        operationId: 'revokeOtherSessions',
        responses: {
          '200': {
            description: 'Sessiyalar bekor qilindi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { revokedCount: { type: 'integer' } },
                },
              },
            },
          },
          '401': {
            description: 'Avtorizatsiya talab qilinadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },

    '/api/v1/auth/sessions/{id}': {
      delete: {
        tags: ['Auth'],
        summary: 'Bitta qurilmani chiqarish',
        description:
          "Yo'qolgan telefondagi sessiyani yopish uchun. Joriy qurilmani bu yerdan yopib bo'lmaydi — buning uchun `/logout` ishlatiladi.",
        operationId: 'revokeSession',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Qurilma chiqarildi',
            content: {
              'application/json': { schema: { type: 'object', properties: { revoked: { type: 'boolean' } } } },
            },
          },
          '400': {
            description: 'Joriy qurilmani chiqarishga urinildi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
          '404': {
            description: 'Qurilma topilmadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },

    // --- Profil -----------------------------------------------------------
    '/api/v1/profile': {
      get: {
        tags: ['Profile'],
        summary: "Profil ma'lumotlari",
        operationId: 'getProfile',
        responses: {
          '200': {
            description: 'Profil',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Profile' } } },
          },
          '401': {
            description: 'Avtorizatsiya talab qilinadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
      patch: {
        tags: ['Profile'],
        summary: 'Profilni yangilash',
        description:
          "Faqat yuborilgan maydonlar o'zgaradi. `null` yuborilsa maydon tozalanadi, yuborilmasa tegilmaydi.",
        operationId: 'updateProfile',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                minProperties: 1,
                properties: {
                  firstName: { type: 'string', minLength: 2, maxLength: 100 },
                  lastName: { type: ['string', 'null'], minLength: 2, maxLength: 100 },
                  avatarUrl: { type: ['string', 'null'], format: 'uri' },
                  dateOfBirth: { type: ['string', 'null'], examples: ['1995-06-15'] },
                  language: { type: 'string', enum: ['UZ', 'RU', 'EN'] },
                  theme: { type: 'string', enum: ['LIGHT', 'DARK', 'SYSTEM'] },
                  timezone: { type: 'string', examples: ['Asia/Tashkent'] },
                  marketingOptIn: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Yangilangan profil',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Profile' } } },
          },
          '400': {
            description: "Ma'lumot noto'g'ri",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },

    '/api/v1/profile/password': {
      post: {
        tags: ['Profile'],
        summary: "Parolni o'zgartirish",
        description:
          "Joriy parol talab qilinadi. Parol o'zgargach joriy qurilmadan tashqari barcha sessiyalar yopiladi.",
        operationId: 'changePassword',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string' },
                  newPassword: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Parol yangilandi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    passwordChanged: { type: 'boolean' },
                    revokedSessions: { type: 'integer' },
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': {
            description: "Joriy parol noto'g'ri yoki yangi parol talabga javob bermaydi",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },

    // --- Manzillar --------------------------------------------------------
    '/api/v1/assistant': {
      post: {
        tags: ['Assistant'],
        summary: 'Yordamchiga xabar yuborish',
        description:
          "Matndan niyat aniqlanadi va yetishmayotgan ma'lumot so'raladi. Javobdagi `action` `confirm_` bilan boshlansa — bu FAQAT tayyorlangan buyruq, pul hali harakatlanmagan. Foydalanuvchi tasdiqlagach mijoz odatdagi endpointga (`/api/v1/payments`, `/api/v1/wallet/transfer`, `/api/v1/wallet/topup`) murojaat qiladi va barcha tekshiruvlar o'sha yerda ishlaydi.\n\nSuhbat holati (`state`) serverda saqlanmaydi — javob bilan qaytariladi va keyingi so'rovda yuboriladi.",
        operationId: 'assistantMessage',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['message'],
                properties: {
                  message: { type: 'string', minLength: 1, maxLength: 500, examples: ["gazga 50 ming to'la"] },
                  state: {
                    type: 'object',
                    description: "Oldingi javobdan qaytgan holat (ko'p qadamli suhbat uchun).",
                    properties: {
                      intent: { type: 'string' },
                      slots: { type: 'object' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Yordamchi javobi',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['text', 'suggestions', 'action', 'state'],
                  properties: {
                    text: { type: 'string' },
                    suggestions: { type: 'array', items: { type: 'string' } },
                    action: {
                      type: 'object',
                      description: 'kind: none | navigate | confirm_topup | confirm_transfer | confirm_payment',
                      properties: { kind: { type: 'string' } },
                    },
                    state: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/payments/providers': {
      get: {
        tags: ['Payments'],
        summary: 'Xizmatlar roʻyxati',
        description: 'Toifa boʻyicha filtrlash mumkin. Faqat faol xizmatlar qaytariladi.',
        operationId: 'listServiceProviders',
        parameters: [
          {
            name: 'category',
            in: 'query',
            schema: { type: 'string', enum: ['ALL', 'UTILITY', 'INTERNET', 'MOBILE', 'TV'], default: 'ALL' },
          },
        ],
        responses: {
          '200': {
            description: 'Xizmatlar',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    providers: { type: 'array', items: { $ref: '#/components/schemas/ServiceProvider' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/payments/providers/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Bitta xizmat',
        description: "To'lov formasi shu yerdan hisob raqami maydonining nomini va summa chegaralarini oladi.",
        operationId: 'getServiceProvider',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Xizmat',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ServiceProvider' } } },
          },
          '404': {
            description: 'Xizmat topilmadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },
    '/api/v1/payments/accounts': {
      get: {
        tags: ['Payments'],
        summary: 'Saqlangan hisoblar',
        operationId: 'listSavedAccounts',
        responses: {
          '200': {
            description: 'Hisoblar',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accounts: { type: 'array', items: { $ref: '#/components/schemas/SavedAccount' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Payments'],
        summary: 'Hisobni saqlash',
        description: 'Kommunal toʻlov har oy takrorlanadi — raqamni qayta kiritmaslik uchun.',
        operationId: 'createSavedAccount',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['providerId', 'accountNumber', 'label'],
                properties: {
                  providerId: { type: 'string', format: 'uuid' },
                  accountNumber: { type: 'string' },
                  label: { type: 'string', minLength: 2, maxLength: 60 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Saqlandi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SavedAccount' } } },
          },
          '409': {
            description: 'Bu hisob allaqachon saqlangan yoki chegara oshdi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },
    '/api/v1/payments/accounts/{id}': {
      delete: {
        tags: ['Payments'],
        summary: 'Saqlangan hisobni oʻchirish',
        description: "O'chirish yumshoq — eski to'lovlar tarixi buzilmaydi.",
        operationId: 'deleteSavedAccount',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: "O'chirildi" },
          '404': {
            description: 'Hisob topilmadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },
    '/api/v1/payments': {
      get: {
        tags: ['Payments'],
        summary: 'Toʻlovlar tarixi',
        operationId: 'listServicePayments',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['ALL', 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'],
              default: 'ALL',
            },
          },
        ],
        responses: {
          '200': {
            description: "To'lovlar",
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    payments: { type: 'array', items: { $ref: '#/components/schemas/ServicePayment' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Payments'],
        summary: 'Xizmat uchun toʻlov',
        description:
          "Pul hamyondan yechiladi. Yechish va to'lov yozuvi BITTA tranzaksiyada bajariladi — biri bajarilib ikkinchisi qolib ketmaydi. Hozircha provayderga so'rov simulyatsiya qilinadi.",
        operationId: 'createServicePayment',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreatePaymentInput' } } },
        },
        responses: {
          '201': {
            description: "To'lov bajarildi",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ServicePayment' } } },
          },
          '404': {
            description: 'Xizmat topilmadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
          '409': {
            description: "Mablag' yetarli emas",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
          '422': {
            description: "Hisob raqami yoki summa noto'g'ri",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },
    '/api/v1/payments/{id}': {
      get: {
        tags: ['Payments'],
        summary: 'Chek',
        description: "Boshqa foydalanuvchining to'lovi so'ralsa 404 qaytadi.",
        operationId: 'getServicePayment',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: "To'lov",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ServicePayment' } } },
          },
          '404': {
            description: "To'lov topilmadi",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },
    '/api/v1/wallet': {
      get: {
        tags: ['Wallet'],
        summary: 'Hamyon holati',
        description:
          "Balans, band qilingan summa va oxirgi 5 ta amal. Barcha summalar TIYINDA (1 so'm = 100 tiyin).",
        operationId: 'getWallet',
        responses: {
          '200': {
            description: 'Hamyon',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/WalletSummary' } } },
          },
          '401': {
            description: 'Avtorizatsiya talab qilinadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },
    '/api/v1/wallet/transactions': {
      get: {
        tags: ['Wallet'],
        summary: 'Amallar tarixi',
        description: 'Sahifalangan roʻyxat. Turi boʻyicha filtrlash mumkin.',
        operationId: 'listWalletTransactions',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          {
            name: 'pageSize',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
          {
            name: 'type',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['ALL', 'TOP_UP', 'WITHDRAWAL', 'PAYMENT', 'REFUND', 'TRANSFER', 'BONUS'],
              default: 'ALL',
            },
          },
        ],
        responses: {
          '200': {
            description: 'Amallar',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    transactions: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/WalletTransaction' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/wallet/topup': {
      post: {
        tags: ['Wallet'],
        summary: "Hisobni to'ldirish",
        description:
          'Hozircha toʻlov provayderi simulyatsiya qilinadi. `idempotencyKey` majburiy: aloqa uzilib qayta yuborilganda pul ikki marta qoʻshilmasligi kerak.',
        operationId: 'topUpWallet',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TopUpInput' } } },
        },
        responses: {
          '201': {
            description: 'Amal bajarildi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/WalletTransaction' } } },
          },
          '409': {
            description: 'Hamyon muzlatilgan yoki yopilgan',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
          '422': {
            description: "Summa yoki to'lov usuli noto'g'ri",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },
    '/api/v1/wallet/transfer': {
      get: {
        tags: ['Wallet'],
        summary: 'Qabul qiluvchini tekshirish',
        description:
          'Pul yuborishdan OLDIN chaqiriladi — foydalanuvchi kimga yuborayotganini koʻrishi kerak. Faqat ism qaytariladi.',
        operationId: 'lookupTransferRecipient',
        parameters: [
          {
            name: 'phone',
            in: 'query',
            required: true,
            schema: { type: 'string', examples: ['+998901234567'] },
          },
        ],
        responses: {
          '200': {
            description: 'Qabul qiluvchi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/TransferRecipient' } } },
          },
          '404': {
            description: 'Bu raqam bilan foydalanuvchi topilmadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
      post: {
        tags: ['Wallet'],
        summary: "Pul o'tkazish",
        description: 'Ikki hamyon bitta tranzaksiya ichida qulflanadi. Mablagʻ yetmasa amal umuman bajarilmaydi.',
        operationId: 'transferMoney',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/TransferInput' } } },
        },
        responses: {
          '201': {
            description: "O'tkazma bajarildi",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/WalletTransaction' } } },
          },
          '404': {
            description: 'Qabul qiluvchi topilmadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
          '409': {
            description: "Mablag' yetarli emas",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },
    '/api/v1/addresses': {
      get: {
        tags: ['Addresses'],
        summary: 'Saqlangan manzillar',
        description: "Standart manzil ro'yxatda birinchi turadi.",
        operationId: 'listAddresses',
        responses: {
          '200': {
            description: 'Manzillar',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    addresses: { type: 'array', items: { $ref: '#/components/schemas/Address' } },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Avtorizatsiya talab qilinadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
      post: {
        tags: ['Addresses'],
        summary: "Manzil qo'shish",
        description: "Birinchi manzil avtomatik standart bo'ladi. Ko'pi bilan 20 ta manzil saqlanadi.",
        operationId: 'createAddress',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AddressInput' } } },
        },
        responses: {
          '201': {
            description: "Manzil qo'shildi",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Address' } } },
          },
          '409': {
            description: "Manzillar chegarasi to'ldi",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },

    '/api/v1/addresses/{id}': {
      get: {
        tags: ['Addresses'],
        summary: 'Bitta manzil',
        operationId: 'getAddress',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Manzil',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Address' } } },
          },
          '404': {
            description: 'Manzil topilmadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
      patch: {
        tags: ['Addresses'],
        summary: 'Manzilni tahrirlash',
        operationId: 'updateAddress',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { allOf: [{ $ref: '#/components/schemas/AddressInput' }], minProperties: 1 },
            },
          },
        },
        responses: {
          '200': {
            description: 'Yangilangan manzil',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Address' } } },
          },
          '404': {
            description: 'Manzil topilmadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
      delete: {
        tags: ['Addresses'],
        summary: "Manzilni o'chirish",
        description:
          "Yumshoq o'chirish — eski buyurtmalarda manzil ko'rinib turadi. Standart manzil o'chirilsa, eng yangi qolgan manzil standart bo'ladi.",
        operationId: 'deleteAddress',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: "Manzil o'chirildi",
            content: {
              'application/json': { schema: { type: 'object', properties: { deleted: { type: 'boolean' } } } },
            },
          },
          '404': {
            description: 'Manzil topilmadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },

    // --- Bildirishnomalar -------------------------------------------------
    '/api/v1/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Bildirishnomalar',
        operationId: 'listNotifications',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'pageSize', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
          { name: 'unreadOnly', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
        ],
        responses: {
          '200': {
            description: "Bildirishnomalar va o'qilmaganlar soni",
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    notifications: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
                    unreadCount: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Avtorizatsiya talab qilinadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
      patch: {
        tags: ['Notifications'],
        summary: "Barchasini o'qilgan deb belgilash",
        operationId: 'markAllNotificationsRead',
        responses: {
          '200': {
            description: 'Belgilandi',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { markedCount: { type: 'integer' } } },
              },
            },
          },
        },
      },
    },

    '/api/v1/notifications/{id}': {
      patch: {
        tags: ['Notifications'],
        summary: "Bitta bildirishnomani o'qilgan deb belgilash",
        operationId: 'markNotificationRead',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': {
            description: 'Bildirishnoma',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Notification' } } },
          },
          '404': {
            description: 'Bildirishnoma topilmadi',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },
  },

  /** Standart holatda barcha endpointlar token talab qiladi (aks holda `security: []`). */
  security: [{ bearerAuth: [] }],
} as const;

export type OpenApiSpec = typeof openApiSpec;

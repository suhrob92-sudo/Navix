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
  tags: [{ name: 'System', description: "Tizim holati va xizmat ko'rsatuvchi endpointlar" }],
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
  },
} as const;

export type OpenApiSpec = typeof openApiSpec;

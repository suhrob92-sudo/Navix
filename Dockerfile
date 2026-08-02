# Navix — production uchun Docker image.
#
# Ko'p bosqichli (multi-stage) qurilish ishlatilgan: yakuniy image'da
# faqat ishlash uchun zarur fayllar qoladi (~150 MB o'rniga ~1 GB emas).
#
# Qurish:  docker build -t navix:latest .
# Ishga tushirish: docker run -p 3000:3000 --env-file .env navix:latest

# --- 1-bosqich: bog'liqliklarni o'rnatish ---------------------------------
FROM node:22-alpine AS deps
WORKDIR /app

# Prisma va sharp uchun kerakli kutubxonalar.
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci

# --- 2-bosqich: loyihani qurish -------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma klientini generatsiya qilamiz (build vaqtida kerak).
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
# BUILD_STANDALONE=1 — Next.js kerakli fayllarni `.next/standalone` ga yig'adi.
ENV BUILD_STANDALONE=1
RUN npm run build

# --- 3-bosqich: ishga tushirish -------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Xavfsizlik: root foydalanuvchi ostida ishlatmaymiz.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# `output: standalone` rejimi kerakli fayllarni o'zi yig'ib beradi.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]

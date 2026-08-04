// ".env" faylini o'qiydi — bu skript Next.js'dan tashqarida ishlaydi,
// shuning uchun muhit o'zgaruvchilarini o'zi yuklashi kerak.
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient, RoleName, ServiceCategory } from '../src/generated/prisma/client';
import { Permission, ROLE_PERMISSIONS, Role } from '../src/config/rbac';
import { SERVICE_PROVIDERS } from '../src/config/service-providers';
import { RESTAURANTS } from '../src/config/restaurants';
import { toSearchText } from '../src/lib/search';

/**
 * Boshlang'ich ma'lumotlarni bazaga yozadi (seed).
 *
 * Nima yoziladi:
 *  1. Barcha ruxsatlar (permissions) — `src/config/rbac.ts` dan olinadi;
 *  2. Barcha rollar (roles);
 *  3. Rol ↔ ruxsat bog'lanishlari.
 *
 * Buyruq: npm run db:seed
 *
 * Bu skript "idempotent" — ya'ni bir necha marta ishga tushirsa ham
 * nusxa yozuvlar yaratmaydi (upsert ishlatilgan).
 */

const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  CUSTOMER: 'Oddiy foydalanuvchi — barcha xizmatlardan foydalanadi',
  DRIVER: 'Taksi haydovchisi — safar buyurtmalarini qabul qiladi',
  COURIER: 'Kuryer — yetkazib berish buyurtmalarini bajaradi',
  MERCHANT: "Sotuvchi — do'kon va mahsulotlarni boshqaradi",
  SUPPORT: "Qo'llab-quvvatlash xodimi — murojaatlarni hal qiladi",
  ADMIN: 'Administrator — platformani boshqaradi',
  SUPER_ADMIN: 'Bosh administrator — barcha ruxsatlarga ega',
};

const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  [Permission.PLATFORM_ADMIN_ACCESS]: 'Admin panelga kirish',
  [Permission.PLATFORM_USER_READ]: "Foydalanuvchi ma'lumotlarini ko'rish",
  [Permission.PLATFORM_USER_UPDATE]: "Foydalanuvchi ma'lumotlarini tahrirlash",
  [Permission.PLATFORM_USER_SUSPEND]: 'Foydalanuvchini bloklash',
  [Permission.PLATFORM_AUDIT_READ]: "Audit jurnalini ko'rish",
  [Permission.PLATFORM_PROVIDER_MANAGE]: 'Xizmat provayderlarini boshqarish',
  [Permission.PLATFORM_TRANSACTION_READ]: "Barcha tranzaksiyalarni ko'rish",
  [Permission.PLATFORM_ROLE_MANAGE]: 'Foydalanuvchilarga rol berish',
  [Permission.PROFILE_READ]: "O'z profilini ko'rish",
  [Permission.PROFILE_UPDATE]: "O'z profilini tahrirlash",
  [Permission.WALLET_READ]: "Hamyon balansini ko'rish",
  [Permission.WALLET_TRANSFER]: "Hamyondan pul o'tkazish",
  [Permission.PAYMENT_CREATE]: "To'lov amalga oshirish",
  [Permission.PAYMENT_REFUND]: "To'lovni qaytarish",
  [Permission.TAXI_RIDE_CREATE]: 'Taksi buyurtma qilish',
  [Permission.TAXI_RIDE_ACCEPT]: 'Taksi buyurtmasini qabul qilish',
  [Permission.TAXI_RIDE_CANCEL]: 'Taksi buyurtmasini bekor qilish',
  [Permission.DELIVERY_ORDER_CREATE]: 'Yetkazib berish buyurtmasini yaratish',
  [Permission.DELIVERY_ORDER_ACCEPT]: 'Yetkazib berish buyurtmasini qabul qilish',
  [Permission.CATALOG_PRODUCT_READ]: "Mahsulotlarni ko'rish",
  [Permission.CATALOG_PRODUCT_MANAGE]: 'Mahsulotlarni boshqarish',
  [Permission.ORDER_CREATE]: 'Buyurtma yaratish',
  [Permission.ORDER_MANAGE]: 'Buyurtmalarni boshqarish',
  [Permission.MERCHANT_DASHBOARD_ACCESS]: 'Biznes kabinetga kirish',
  [Permission.MERCHANT_STAFF_MANAGE]: 'Biznes xodimlarini boshqarish',
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL topilmadi. ".env" faylini tekshiring.');
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

async function seedPermissions(prisma: PrismaClient): Promise<void> {
  const permissionKeys = Object.values(Permission);

  for (const key of permissionKeys) {
    // Ruxsat kaliti "modul:resurs:amal" ko'rinishida — birinchi qismi modul nomi.
    const [module] = key.split(':');

    await prisma.permission.upsert({
      where: { key },
      update: { description: PERMISSION_DESCRIPTIONS[key] ?? key, module },
      create: { key, description: PERMISSION_DESCRIPTIONS[key] ?? key, module },
    });
  }

  console.info(`✅ ${permissionKeys.length} ta ruxsat yozildi`);
}

async function seedRoles(prisma: PrismaClient): Promise<void> {
  const roleNames = Object.values(Role) as RoleName[];

  for (const name of roleNames) {
    await prisma.role.upsert({
      where: { name },
      update: { description: ROLE_DESCRIPTIONS[name] },
      create: { name, description: ROLE_DESCRIPTIONS[name], isSystem: true },
    });
  }

  console.info(`✅ ${roleNames.length} ta rol yozildi`);
}

async function seedRolePermissions(prisma: PrismaClient): Promise<void> {
  const permissions = await prisma.permission.findMany({ select: { id: true, key: true } });
  const permissionIdByKey = new Map(permissions.map((permission) => [permission.key, permission.id]));

  let linkCount = 0;

  for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({ where: { name: roleName as RoleName } });
    if (!role) continue;

    for (const key of permissionKeys) {
      const permissionId = permissionIdByKey.get(key);
      if (!permissionId) continue;

      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });

      linkCount += 1;
    }
  }

  console.info(`✅ ${linkCount} ta rol–ruxsat bog'lanishi yozildi`);
}

/**
 * To'lov qabul qiluvchi xizmatlarni yozadi.
 *
 * `upsert` ishlatiladi: mavjud provayder ma'lumotlari yangilanadi, lekin
 * uning ID'si o'zgarmaydi — aks holda eski to'lovlar bog'lanishini
 * yo'qotardi.
 */
async function seedServiceProviders(prisma: PrismaClient): Promise<void> {
  for (const provider of SERVICE_PROVIDERS) {
    const data = {
      name: provider.name,
      category: provider.category as ServiceCategory,
      description: provider.description,
      accountLabel: provider.accountLabel,
      accountHint: provider.accountHint,
      accountRegex: provider.accountRegex,
      // Chegaralar konfiguratsiyada so'mda, bazada esa tiyinda saqlanadi.
      minAmount: BigInt(provider.minAmountSom) * 100n,
      maxAmount: BigInt(provider.maxAmountSom) * 100n,
      color: provider.color,
      sortOrder: provider.sortOrder,
      isActive: true,
    };

    await prisma.serviceProvider.upsert({
      where: { code: provider.code },
      update: data,
      create: { code: provider.code, ...data },
    });
  }

  console.info(`✅ ${SERVICE_PROVIDERS.length} ta xizmat provayderi yozildi`);
}

/**
 * Restoranlar va menyularni yozadi.
 *
 * `upsert` kaliti — `slug` va (restoran + bo'lim nomi). Shu sababli
 * seed qayta ishga tushirilganda mavjud taomlarning ID'si o'zgarmaydi
 * va eski buyurtmalar bog'lanishini yo'qotmaydi.
 */
async function seedRestaurants(prisma: PrismaClient): Promise<void> {
  let itemCount = 0;

  for (const restaurant of RESTAURANTS) {
    const data = {
      name: restaurant.name,
      // Qidiruv ustuni HAR DOIM nom bilan birga yoziladi — ikkalasi
      // ajralib qolsa qidiruv jimgina noto'g'ri ishlay boshlaydi.
      searchName: toSearchText(restaurant.name),
      description: restaurant.description,
      cuisine: restaurant.cuisine,
      deliveryFee: BigInt(restaurant.deliveryFeeSom) * 100n,
      minOrder: BigInt(restaurant.minOrderSom) * 100n,
      deliveryMinutes: restaurant.deliveryMinutes,
      rating: restaurant.rating,
      ratingCount: restaurant.ratingCount,
      color: restaurant.color,
      sortOrder: restaurant.sortOrder,
      isActive: true,
    };

    const saved = await prisma.restaurant.upsert({
      where: { slug: restaurant.slug },
      update: data,
      create: { slug: restaurant.slug, ...data },
    });

    for (const [categoryIndex, category] of restaurant.categories.entries()) {
      const savedCategory = await prisma.menuCategory.upsert({
        where: { restaurantId_name: { restaurantId: saved.id, name: category.name } },
        update: { sortOrder: (categoryIndex + 1) * 10 },
        create: { restaurantId: saved.id, name: category.name, sortOrder: (categoryIndex + 1) * 10 },
      });

      for (const [itemIndex, item] of category.items.entries()) {
        // Taomning tabiiy kaliti yo'q, shuning uchun nom bo'yicha qidiramiz.
        const existing = await prisma.menuItem.findFirst({
          where: { restaurantId: saved.id, name: item.name },
          select: { id: true },
        });

        const itemData = {
          restaurantId: saved.id,
          categoryId: savedCategory.id,
          name: item.name,
          searchName: toSearchText(item.name),
          description: item.description ?? null,
          price: BigInt(item.priceSom) * 100n,
          sortOrder: (itemIndex + 1) * 10,
          isAvailable: true,
        };

        if (existing) {
          await prisma.menuItem.update({ where: { id: existing.id }, data: itemData });
        } else {
          await prisma.menuItem.create({ data: itemData });
        }

        itemCount += 1;
      }
    }
  }

  console.info(`✅ ${RESTAURANTS.length} ta restoran va ${itemCount} ta taom yozildi`);
}

async function main(): Promise<void> {
  const prisma = createClient();

  try {
    console.info("🌱 Boshlang'ich ma'lumotlar yozilmoqda...");
    await seedPermissions(prisma);
    await seedRoles(prisma);
    await seedRolePermissions(prisma);
    await seedServiceProviders(prisma);
    await seedRestaurants(prisma);
    console.info('🎉 Tayyor!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('❌ Seed bajarilmadi:', error);
  process.exit(1);
});

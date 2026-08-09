// ".env" faylini o'qiydi — bu skript Next.js'dan tashqarida ishlaydi,
// shuning uchun muhit o'zgaruvchilarini o'zi yuklashi kerak.
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient, RoleName, ServiceCategory } from '../src/generated/prisma/client';
import { Permission, ROLE_PERMISSIONS, Role } from '../src/config/rbac';
import { SERVICE_PROVIDERS } from '../src/config/service-providers';
import { RESTAURANTS } from '../src/config/restaurants';
import { PRODUCT_CATEGORIES, SHOPS } from '../src/config/marketplace';
import { COMPANIES, JOB_CATEGORIES } from '../src/config/jobs';
import { HOTELS } from '../src/config/hotels';
import { TRIP_SCHEDULES } from '../src/config/travel';
import { BUSINESS_PROFILES } from '../src/config/business';
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
  EMPLOYER: "Ish beruvchi — vakansiya joylaydi va nomzodlarni ko'rib chiqadi",
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
  [Permission.SELLER_DASHBOARD_ACCESS]: 'Sotuvchi kabinetiga kirish',
  [Permission.EMPLOYER_DASHBOARD_ACCESS]: 'Ish beruvchi kabinetiga kirish',
  [Permission.EMPLOYER_VACANCY_MANAGE]: 'Vakansiya joylash va tahrirlash',
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

/**
 * Marketplace: toifalar, do'konlar va mahsulotlar.
 *
 * ── Nima uchun toifalar ALOHIDA yoziladi ──────────────────────────────
 * Menyu bo'limi restoranga tegishli, mahsulot toifasi esa butun
 * maydonchaga umumiy. Shuning uchun avval toifalar yoziladi, keyin
 * mahsulotlar ularga bog'lanadi.
 *
 * ── Zaxira qayta yozilmaydi ───────────────────────────────────────────
 * `stock` faqat mahsulot BIRINCHI marta yaratilganda qo'yiladi. Aks
 * holda seed'ni qayta ishga tushirish sotilgan mahsulotlarni "tiklab"
 * yuborardi va hisob buzilardi.
 */
async function seedMarketplace(prisma: PrismaClient): Promise<void> {
  const categoryIdBySlug = new Map<string, string>();

  for (const category of PRODUCT_CATEGORIES) {
    const data = {
      name: category.name,
      icon: category.icon,
      sortOrder: category.sortOrder,
    };

    const saved = await prisma.productCategory.upsert({
      where: { slug: category.slug },
      update: data,
      create: { slug: category.slug, ...data },
    });

    categoryIdBySlug.set(category.slug, saved.id);
  }

  let productCount = 0;

  for (const shop of SHOPS) {
    const shopData = {
      name: shop.name,
      searchName: toSearchText(shop.name),
      description: shop.description,
      deliveryFee: BigInt(shop.deliveryFeeSom) * 100n,
      minOrder: BigInt(shop.minOrderSom) * 100n,
      deliveryDays: shop.deliveryDays,
      rating: shop.rating,
      ratingCount: shop.ratingCount,
      color: shop.color,
      sortOrder: shop.sortOrder,
      isActive: true,
    };

    const savedShop = await prisma.shop.upsert({
      where: { slug: shop.slug },
      update: shopData,
      create: { slug: shop.slug, ...shopData },
    });

    for (const [index, product] of shop.products.entries()) {
      const categoryId = categoryIdBySlug.get(product.categorySlug);

      if (!categoryId) {
        throw new Error(`"${product.slug}" mahsulotining toifasi topilmadi: ${product.categorySlug}`);
      }

      const shared = {
        shopId: savedShop.id,
        categoryId,
        name: product.name,
        searchName: toSearchText(product.name),
        description: product.description ?? null,
        price: BigInt(product.priceSom) * 100n,
        oldPrice: product.oldPriceSom === undefined ? null : BigInt(product.oldPriceSom) * 100n,
        sortOrder: (index + 1) * 10,
        isActive: true,
      };

      await prisma.product.upsert({
        where: { slug: product.slug },
        // Zaxira YANGILANMAYDI — yuqoridagi izohga qarang.
        update: shared,
        create: { slug: product.slug, ...shared, stock: product.stock },
      });

      productCount += 1;
    }
  }

  console.info(
    `✅ ${PRODUCT_CATEGORIES.length} ta toifa, ${SHOPS.length} ta do'kon va ${productCount} ta mahsulot yozildi`,
  );
}

/**
 * Ish qidirish katalogi.
 *
 * Tuzilishi `seedMarketplace` bilan bir xil: avval yo'nalishlar, keyin
 * kompaniyalar va ularning vakansiyalari. Farqi maoshda — u IXTIYORIY
 * va ko'rsatilmagan bo'lsa `null` yoziladi ("Kelishilgan").
 */
/**
 * Mehmonxonalar va ularning xonalari.
 *
 * Xonalar `deleteMany` + qayta yozish emas, `upsert` bilan: mavjud
 * xonaga bog'langan BANDLOVLAR bor va ularni yo'qotib bo'lmaydi.
 */
async function seedHotels(prisma: PrismaClient): Promise<void> {
  let roomCount = 0;

  for (const hotel of HOTELS) {
    const data = {
      name: hotel.name,
      searchName: toSearchText(hotel.name),
      description: hotel.description,
      city: hotel.city,
      address: hotel.address,
      stars: hotel.stars,
      rating: hotel.rating,
      ratingCount: hotel.ratingCount,
      amenities: [...hotel.amenities],
      color: hotel.color,
      sortOrder: hotel.sortOrder,
      isActive: true,
    };

    const saved = await prisma.hotel.upsert({
      where: { slug: hotel.slug },
      update: data,
      create: { slug: hotel.slug, ...data },
      select: { id: true },
    });

    for (const [index, room] of hotel.rooms.entries()) {
      const existing = await prisma.hotelRoom.findFirst({
        where: { hotelId: saved.id, name: room.name },
        select: { id: true },
      });

      const roomData = {
        description: room.description ?? null,
        capacity: room.capacity,
        pricePerNight: BigInt(room.pricePerNightSom) * 100n,
        totalRooms: room.totalRooms,
        sortOrder: index,
        isActive: true,
      };

      if (existing) {
        await prisma.hotelRoom.update({ where: { id: existing.id }, data: roomData });
      } else {
        await prisma.hotelRoom.create({ data: { hotelId: saved.id, name: room.name, ...roomData } });
      }

      roomCount += 1;
    }
  }

  console.info(`✅ ${HOTELS.length} ta mehmonxona va ${roomCount} ta xona turi yozildi`);
}

/**
 * Reys jadvallari.
 *
 * `upsert` bilan: mavjud jadvalga bog'langan CHIPTALAR bor va ularni
 * yo'qotib bo'lmaydi. Kalit — reys raqami (`code`).
 */
async function seedTrips(prisma: PrismaClient): Promise<void> {
  for (const trip of TRIP_SCHEDULES) {
    const data = {
      carrier: trip.carrier,
      transport: trip.transport,
      fromCity: trip.fromCity,
      toCity: trip.toCity,
      departTime: trip.departTime,
      durationMinutes: trip.durationMinutes,
      weekdays: [...trip.weekdays],
      priceTiyin: BigInt(trip.priceSom) * 100n,
      totalSeats: trip.totalSeats,
      sortOrder: trip.sortOrder,
      isActive: true,
    };

    await prisma.tripSchedule.upsert({
      where: { code: trip.code },
      update: data,
      create: { code: trip.code, ...data },
      select: { id: true },
    });
  }

  console.info(`✅ ${TRIP_SCHEDULES.length} ta reys jadvali yozildi`);
}

/**
 * Restoran va do'konlarning ommaviy profillari.
 *
 * Kalit — `slug`. Restoran ham, do'kon ham shu nom bilan izlanadi:
 * qaysi biri topilsa, profil o'shanga bog'lanadi.
 */
async function seedBusinessProfiles(prisma: PrismaClient): Promise<void> {
  let written = 0;

  for (const entry of BUSINESS_PROFILES) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug: entry.slug },
      select: { id: true },
    });

    const shop = restaurant
      ? null
      : await prisma.shop.findUnique({ where: { slug: entry.slug }, select: { id: true } });

    if (!restaurant && !shop) {
      console.warn(`   ⚠️  "${entry.slug}" uchun restoran ham, do'kon ham topilmadi`);
      continue;
    }

    const data = {
      city: entry.city,
      address: entry.address,
      phone: entry.phone,
      opensAt: entry.opensAt,
      closesAt: entry.closesAt,
      about: entry.about,
      isVerified: entry.isVerified,
    };

    /**
     * `upsert` kaliti — restoran yoki do'kon ID'si.
     *
     * Shu tufayli seed qayta ishga tushirilganda mavjud profil
     * yangilanadi, unga bog'langan OBUNALAR esa saqlanib qoladi.
     */
    if (restaurant) {
      await prisma.businessProfile.upsert({
        where: { restaurantId: restaurant.id },
        update: data,
        create: { restaurantId: restaurant.id, ...data },
        select: { id: true },
      });
    } else if (shop) {
      await prisma.businessProfile.upsert({
        where: { shopId: shop.id },
        update: data,
        create: { shopId: shop.id, ...data },
        select: { id: true },
      });
    }

    written += 1;
  }

  console.info(`✅ ${written} ta biznes profili yozildi`);
}

async function seedJobs(prisma: PrismaClient): Promise<void> {
  const categoryIdBySlug = new Map<string, string>();

  for (const category of JOB_CATEGORIES) {
    const data = { name: category.name, icon: category.icon, sortOrder: category.sortOrder };

    const saved = await prisma.jobCategory.upsert({
      where: { slug: category.slug },
      update: data,
      create: { slug: category.slug, ...data },
    });

    categoryIdBySlug.set(category.slug, saved.id);
  }

  let vacancyCount = 0;

  for (const company of COMPANIES) {
    const companyData = {
      name: company.name,
      searchName: toSearchText(company.name),
      description: company.description,
      industry: company.industry,
      city: company.city,
      color: company.color,
      sortOrder: company.sortOrder,
      isActive: true,
    };

    const savedCompany = await prisma.company.upsert({
      where: { slug: company.slug },
      update: companyData,
      create: { slug: company.slug, ...companyData },
    });

    for (const vacancy of company.vacancies) {
      const categoryId = categoryIdBySlug.get(vacancy.categorySlug);

      if (!categoryId) {
        throw new Error(`"${vacancy.slug}" vakansiyasining yo'nalishi topilmadi: ${vacancy.categorySlug}`);
      }

      const vacancyData = {
        companyId: savedCompany.id,
        categoryId,
        title: vacancy.title,
        searchName: toSearchText(vacancy.title),
        description: vacancy.description,
        // Ko'rsatilmagan maosh `null` bo'ladi — nol EMAS.
        salaryMin: vacancy.salaryMinSom === undefined ? null : BigInt(vacancy.salaryMinSom) * 100n,
        salaryMax: vacancy.salaryMaxSom === undefined ? null : BigInt(vacancy.salaryMaxSom) * 100n,
        employmentType: vacancy.employmentType,
        experienceLevel: vacancy.experienceLevel,
        city: vacancy.city,
        sortOrder: vacancy.sortOrder,
        isActive: true,
      };

      await prisma.vacancy.upsert({
        where: { slug: vacancy.slug },
        update: vacancyData,
        create: { slug: vacancy.slug, ...vacancyData },
      });

      vacancyCount += 1;
    }
  }

  console.info(
    `✅ ${JOB_CATEGORIES.length} ta yo'nalish, ${COMPANIES.length} ta kompaniya va ${vacancyCount} ta vakansiya yozildi`,
  );
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
    await seedMarketplace(prisma);
    await seedJobs(prisma);
    await seedHotels(prisma);
    await seedTrips(prisma);
    await seedBusinessProfiles(prisma);
    console.info('🎉 Tayyor!');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('❌ Seed bajarilmadi:', error);
  process.exit(1);
});

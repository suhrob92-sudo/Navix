-- Mijoz kalitini EGASI bilan birga saqlash uchun ustun kengaytiriladi.
--
-- Nima uchun: "idempotencyKey" butun baza bo'ylab yagona edi va unda
-- uch xil narsa aralashib yotardi — mijozning kaliti, BOSHQA mijozning
-- kaliti va server yaratgan kalit ("market-refund-{id}").
--
-- Endi mijoz kaliti "client:{foydalanuvchiId}:{kalit}" ko'rinishida
-- saqlanadi. Eng uzun holat: 7 + 36 + 1 + 100 + 3 ("-in") = 147 belgi,
-- shuning uchun 120 dan 200 ga kengaytiramiz.
ALTER TABLE "wallet_transactions"
  ALTER COLUMN "idempotencyKey" TYPE VARCHAR(200);

-- Eskidan qolgan mijoz kalitlarini yangi ko'rinishga o'tkazamiz.
--
-- Server kalitlari TEGILMAYDI: ular obyektga bog'langan va
-- "{modul}-refund-{obyektId}" ko'rinishida qoladi.
--
-- O'TKAZMANING KIRIM yozuvi ham tegilmaydi: uning kaliti YUBORUVCHI
-- nomidan yasalgan, qator esa QABUL QILUVCHI hamyoniga tegishli —
-- ya'ni bu yerdan to'g'ri egasini aniqlab bo'lmaydi. Bunday eski
-- yozuvlar shunchaki tarixda qoladi va yangi kalitlar bilan
-- to'qnashmaydi (yangi kalitlarda "client:" old qo'shimchasi bor).
UPDATE "wallet_transactions" AS t
SET "idempotencyKey" = 'client:' || w."userId" || ':' || t."idempotencyKey"
FROM "wallets" AS w
WHERE w."id" = t."walletId"
  AND t."idempotencyKey" NOT LIKE 'client:%'
  AND NOT (t."type" = 'TRANSFER' AND t."direction" = 'IN')
  AND t."idempotencyKey" !~ '^(market-refund|market-return|booking-refund|food-refund|parcel-refund|ticket-refund|delivery-payout|refund)-';

-- O'TKAZMANING KIRIM yozuvi — alohida holat.
--
-- Uning kaliti YUBORUVCHI nomidan yasaladi ("{kalit}-in"), qator esa
-- QABUL QILUVCHI hamyoniga tegishli. Ya'ni yuqoridagi so'rov bilan
-- to'g'ri egani topib bo'lmaydi.
--
-- Lekin yuboruvchi ID'si o'sha yozuvning "sourceId" ustunida turadi
-- (kod: performTransfer). Shuning uchun uni aynan shu ustundan olamiz.
UPDATE "wallet_transactions" AS t
SET "idempotencyKey" = 'client:' || t."sourceId" || ':' || t."idempotencyKey"
WHERE t."type" = 'TRANSFER'
  AND t."direction" = 'IN'
  AND t."sourceId" IS NOT NULL
  AND t."idempotencyKey" NOT LIKE 'client:%';

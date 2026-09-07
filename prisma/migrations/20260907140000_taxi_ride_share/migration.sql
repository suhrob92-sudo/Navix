-- Safarni ulashish kaliti.
--
-- Ustun NULL bo'lishi mumkin va standart qiymati yo'q: mavjud
-- qatorlar tegilmaydi va jadval qayta yozilmaydi.
ALTER TABLE "taxi_rides" ADD COLUMN "shareToken" VARCHAR(64);

-- Kalit YAGONA bo'lishi shart: ikkita safar bir xil havolada
-- ochilsa, kuzatayotgan odam boshqa birovning safarini ko'rardi.
--
-- Qisman indeks: NULL qiymatlar indeksga tushmaydi va u kichik qoladi.
CREATE UNIQUE INDEX "taxi_rides_shareToken_key" ON "taxi_rides" ("shareToken")
  WHERE "shareToken" IS NOT NULL;

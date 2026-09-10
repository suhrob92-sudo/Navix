-- Posilkani KUZATISH kaliti.
--
-- Qabul qiluvchi ilovada bo'lmasligi mumkin. Kalit bo'yicha u
-- posilkaning holatini ko'radi — telefon raqami, narxi va ichki
-- ID'siz.
--
-- Ustun IXTIYORIY: har posilka ulashilmaydi.
ALTER TABLE "parcels" ADD COLUMN IF NOT EXISTS "trackToken" VARCHAR(64);

-- Kalit YAGONA: ikkita posilka bir xil havolada ochilishi mumkin emas.
-- `NULL` qiymatlar PostgreSQL'da unikallikka xalaqit bermaydi.
CREATE UNIQUE INDEX IF NOT EXISTS "parcels_trackToken_key" ON "parcels"("trackToken");

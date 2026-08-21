-- Tashqi kalitlarga INDEKS qo'shish.
--
-- ── Muammo ──────────────────────────────────────────────────────────
-- PostgreSQL tashqi kalit uchun indeksni O'ZI yaratmaydi. Indekssiz
-- tashqi kalit ikki joyda og'riq beradi:
--
--   1. OTA qator o'chirilganda baza bola jadvalni BUTUNLAY o'qib
--      chiqadi ("bu qatorga bog'langanlari bormi?"). `post_seen`
--      millionlab qatorga yetadi — bitta postni o'chirish sekundlab
--      cho'ziladi va butun jadvalni bloklaydi.
--
--   2. Teskari qidiruv ham to'liq o'qishga aylanadi. Masalan restoran
--      kabineti o'z buyurtmalarini so'raganda.
--
-- Tekshiruvda 22 ta indekssiz tashqi kalit topildi. Ular orasida
-- lentaning "hassos filtri" ishlatadigan `user_reports.postId` ham
-- bor — u HAR BIR lenta so'rovida tekshiriladi.
--
-- ── Nima uchun CONCURRENTLY emas ────────────────────────────────────
-- `CREATE INDEX CONCURRENTLY` ni tranzaksiya ichida bajarib bo'lmaydi,
-- Prisma migratsiyasi esa tranzaksiyada ishlaydi. Jadvallar hozircha
-- kichik, shuning uchun oddiy `CREATE INDEX` yetarli. Ma'lumot
-- ko'payganda bu migratsiya allaqachon qo'llangan bo'ladi.

CREATE INDEX "saved_accounts_providerId_idx" ON "saved_accounts"("providerId");
CREATE INDEX "service_payments_providerId_idx" ON "service_payments"("providerId");
CREATE INDEX "food_orders_restaurantId_idx" ON "food_orders"("restaurantId");
CREATE INDEX "food_orders_addressId_idx" ON "food_orders"("addressId");
CREATE INDEX "food_order_items_menuItemId_idx" ON "food_order_items"("menuItemId");
CREATE INDEX "market_orders_addressId_idx" ON "market_orders"("addressId");
CREATE INDEX "market_order_items_productId_idx" ON "market_order_items"("productId");
CREATE INDEX "conversations_businessProfileId_idx" ON "conversations"("businessProfileId");
CREATE INDEX "messages_senderId_idx" ON "messages"("senderId");
CREATE INDEX "user_reports_postId_idx" ON "user_reports"("postId");
CREATE INDEX "user_reports_commentId_idx" ON "user_reports"("commentId");
CREATE INDEX "user_reports_storyId_idx" ON "user_reports"("storyId");
CREATE INDEX "post_comments_authorId_idx" ON "post_comments"("authorId");
CREATE INDEX "message_reactions_userId_idx" ON "message_reactions"("userId");
CREATE INDEX "module_switches_updatedById_idx" ON "module_switches"("updatedById");
CREATE INDEX "support_tickets_assigneeId_idx" ON "support_tickets"("assigneeId");
CREATE INDEX "support_messages_authorId_idx" ON "support_messages"("authorId");
CREATE INDEX "post_saves_collectionId_idx" ON "post_saves"("collectionId");
CREATE INDEX "stories_productId_idx" ON "stories"("productId");
CREATE INDEX "post_seen_postId_idx" ON "post_seen"("postId");
CREATE INDEX "post_hidden_postId_idx" ON "post_hidden"("postId");
CREATE INDEX "content_removals_moderatorId_idx" ON "content_removals"("moderatorId");

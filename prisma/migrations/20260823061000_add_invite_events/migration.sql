-- Havola bilan bog'liq hodisalar.
--
-- Ular suhbat ichida ko'rinadi: havola ochilgani va yopilgani
-- a'zolardan yashirilmasligi kerak.
ALTER TYPE "SystemMessageKind" ADD VALUE IF NOT EXISTS 'INVITE_CREATED';
ALTER TYPE "SystemMessageKind" ADD VALUE IF NOT EXISTS 'INVITE_ROTATED';
ALTER TYPE "SystemMessageKind" ADD VALUE IF NOT EXISTS 'INVITE_REVOKED';
ALTER TYPE "SystemMessageKind" ADD VALUE IF NOT EXISTS 'JOINED_BY_LINK';

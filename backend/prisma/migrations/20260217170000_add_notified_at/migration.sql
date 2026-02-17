-- AlterTable
ALTER TABLE `trades` ADD COLUMN `notified_at` DATETIME(3) NULL;

-- Mark all existing COMPLETED/TRADE_HOLD SELL trades as already notified
-- to prevent mass notifications on first sync after migration
UPDATE `trades` SET `notified_at` = NOW()
WHERE `type` = 'SELL' AND `status` IN ('COMPLETED', 'TRADE_HOLD');

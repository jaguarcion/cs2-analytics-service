-- AlterTable
ALTER TABLE `trades`
  ADD COLUMN `manual_buy_trade_id` VARCHAR(36) NULL,
  ADD COLUMN `profit_bucket` VARCHAR(20) NULL;

-- Index for faster lookup of manually-linked sells
CREATE INDEX `trades_manual_buy_trade_id_idx` ON `trades`(`manual_buy_trade_id`);

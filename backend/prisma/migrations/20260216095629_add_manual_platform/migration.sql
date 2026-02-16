-- AlterTable
ALTER TABLE `items` MODIFY `platform_source` ENUM('CSFLOAT', 'MARKET_CSGO', 'MANUAL') NOT NULL;

-- AlterTable
ALTER TABLE `listings` MODIFY `platform_source` ENUM('CSFLOAT', 'MARKET_CSGO', 'MANUAL') NOT NULL;

-- AlterTable
ALTER TABLE `trades` MODIFY `platform_source` ENUM('CSFLOAT', 'MARKET_CSGO', 'MANUAL') NOT NULL;

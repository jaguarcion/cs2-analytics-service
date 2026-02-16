-- AlterTable
ALTER TABLE `items` ADD COLUMN `custom_source` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `trades` ADD COLUMN `custom_source` VARCHAR(50) NULL;

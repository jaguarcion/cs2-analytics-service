-- CreateTable
CREATE TABLE `items` (
    `id` VARCHAR(36) NOT NULL,
    `external_id` VARCHAR(255) NULL,
    `platform_source` ENUM('CSFLOAT', 'MARKET_CSGO') NOT NULL,
    `name` VARCHAR(512) NOT NULL,
    `wear` VARCHAR(64) NULL,
    `float_value` DOUBLE NULL,
    `asset_id` VARCHAR(255) NULL,
    `image_url` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `items_asset_id_idx`(`asset_id`),
    INDEX `items_name_float_value_idx`(`name`(255), `float_value`),
    UNIQUE INDEX `items_platform_source_external_id_key`(`platform_source`, `external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `listings` (
    `id` VARCHAR(36) NOT NULL,
    `external_id` VARCHAR(255) NULL,
    `item_id` VARCHAR(36) NOT NULL,
    `platform_source` ENUM('CSFLOAT', 'MARKET_CSGO') NOT NULL,
    `price` DOUBLE NOT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'USD',
    `status` ENUM('ACTIVE', 'SOLD', 'CANCELLED', 'DELISTED') NOT NULL DEFAULT 'ACTIVE',
    `listed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `listings_platform_source_external_id_key`(`platform_source`, `external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trades` (
    `id` VARCHAR(36) NOT NULL,
    `external_id` VARCHAR(255) NULL,
    `platform_source` ENUM('CSFLOAT', 'MARKET_CSGO') NOT NULL,
    `item_id` VARCHAR(36) NOT NULL,
    `buy_price` DOUBLE NULL,
    `sell_price` DOUBLE NULL,
    `commission` DOUBLE NULL DEFAULT 0,
    `status` ENUM('PENDING', 'ACCEPTED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `type` VARCHAR(10) NOT NULL,
    `traded_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `trades_platform_source_external_id_key`(`platform_source`, `external_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fx_rates` (
    `id` VARCHAR(36) NOT NULL,
    `pair` VARCHAR(20) NOT NULL,
    `rate` DOUBLE NOT NULL,
    `source` VARCHAR(50) NOT NULL DEFAULT 'market_csgo',
    `fetched_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `fx_rates_pair_fetched_at_idx`(`pair`, `fetched_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sync_logs` (
    `id` VARCHAR(36) NOT NULL,
    `source` VARCHAR(50) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `items_processed` INTEGER NOT NULL DEFAULT 0,
    `error_message` TEXT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `finished_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `listings` ADD CONSTRAINT `listings_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `trades` ADD CONSTRAINT `trades_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

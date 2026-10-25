/*
  Warnings:

  - You are about to drop the column `idLoyaltyTransaction` on the `orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `orders` DROP COLUMN `idLoyaltyTransaction`;

-- CreateTable
CREATE TABLE `loyalty_programs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `earnMode` VARCHAR(20) NOT NULL,
    `earnValue` DOUBLE NOT NULL,
    `redeemMode` VARCHAR(20) NOT NULL,
    `pointsPerReward` DOUBLE NOT NULL,
    `pointValue` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `loyalty_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pointsEarned` DOUBLE NOT NULL,
    `balanceAfter` DOUBLE NOT NULL,
    `transactionType` VARCHAR(20) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `idClient` INTEGER NOT NULL,
    `idLoyaltyProgram` INTEGER NOT NULL,
    `idOrder` INTEGER NULL,

    INDEX `loyalty_transactions_idClient_idx`(`idClient`),
    INDEX `loyalty_transactions_idLoyaltyProgram_idx`(`idLoyaltyProgram`),
    INDEX `loyalty_transactions_idOrder_idx`(`idOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_idClient_fkey` FOREIGN KEY (`idClient`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_idLoyaltyProgram_fkey` FOREIGN KEY (`idLoyaltyProgram`) REFERENCES `loyalty_programs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `loyalty_transactions` ADD CONSTRAINT `loyalty_transactions_idOrder_fkey` FOREIGN KEY (`idOrder`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

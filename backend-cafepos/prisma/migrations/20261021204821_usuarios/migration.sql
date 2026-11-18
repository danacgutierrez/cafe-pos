-- CreateTable
CREATE TABLE `products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `price` DOUBLE NOT NULL,
    `description` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `loyaltyBalance` DOUBLE NOT NULL DEFAULT 0,
    `phoneNumber` VARCHAR(20) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `scheduleTime` DATETIME(3) NOT NULL,
    `notes` TEXT NULL,
    `total` DOUBLE NOT NULL,
    `deliveryNotes` TEXT NULL,
    `deliveryMode` VARCHAR(20) NOT NULL,
    `fulfillmentType` VARCHAR(20) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `deliveryFee` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `idClient` INTEGER NOT NULL,
    `idLoyaltyTransaction` INTEGER NULL,

    INDEX `orders_idClient_idx`(`idClient`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantity` INTEGER NOT NULL,
    `price` DOUBLE NOT NULL,
    `idOrder` INTEGER NOT NULL,
    `idProduct` INTEGER NOT NULL,

    INDEX `order_details_idOrder_idx`(`idOrder`),
    INDEX `order_details_idProduct_idx`(`idProduct`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `correo` VARCHAR(160) NOT NULL,
    `passwordHash` VARCHAR(72) NOT NULL,
    `rol` VARCHAR(20) NOT NULL DEFAULT 'client',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `idClient` INTEGER NULL,

    UNIQUE INDEX `usuarios_correo_key`(`correo`),
    UNIQUE INDEX `usuarios_idClient_key`(`idClient`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_idClient_fkey` FOREIGN KEY (`idClient`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_details` ADD CONSTRAINT `order_details_idOrder_fkey` FOREIGN KEY (`idOrder`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_details` ADD CONSTRAINT `order_details_idProduct_fkey` FOREIGN KEY (`idProduct`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_idClient_fkey` FOREIGN KEY (`idClient`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

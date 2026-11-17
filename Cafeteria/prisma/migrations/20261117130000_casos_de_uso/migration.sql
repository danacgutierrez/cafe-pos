-- Menú: tipos, sabores, opciones y bebidas (RN-01 a RN-08).
CREATE TABLE `drink_types` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `flavors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idDrinkType` INTEGER NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`),
    INDEX `flavors_idDrinkType_idx` (`idDrinkType`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `menu_options` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `surcharge` DOUBLE NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`),
    INDEX `menu_options_kind_idx` (`kind`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `beverages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `idDrinkType` INTEGER NOT NULL,
    `idFlavor` INTEGER NOT NULL,
    `basePrice` DOUBLE NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `allowsMilk` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`),
    INDEX `beverages_idDrinkType_idx` (`idDrinkType`),
    INDEX `beverages_idFlavor_idx` (`idFlavor`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `recipes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idBeverage` INTEGER NOT NULL,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `recipes_idBeverage_key` (`idBeverage`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `ingredients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `stock` DOUBLE NOT NULL DEFAULT 0,
    `minStock` DOUBLE NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `recipe_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idRecipe` INTEGER NOT NULL,
    `idIngredient` INTEGER NOT NULL,
    `baseQuantity` DOUBLE NOT NULL,

    PRIMARY KEY (`id`),
    INDEX `recipe_items_idRecipe_idx` (`idRecipe`),
    INDEX `recipe_items_idIngredient_idx` (`idIngredient`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Inventario: cada cambio queda registrado (RN-30); no se edita ni se borra.
CREATE TABLE `inventory_movements` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idIngredient` INTEGER NOT NULL,
    `movementType` VARCHAR(20) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `balanceAfter` DOUBLE NOT NULL,
    `reason` TEXT NULL,
    `responsible` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    INDEX `inventory_movements_idIngredient_idx` (`idIngredient`),
    INDEX `inventory_movements_createdAt_idx` (`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Pagos: solo referencia del proveedor, nunca datos de tarjeta (RN-21).
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idOrder` INTEGER NOT NULL,
    `method` VARCHAR(20) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `providerPaymentId` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    UNIQUE INDEX `payments_providerPaymentId_key` (`providerPaymentId`),
    INDEX `payments_idOrder_idx` (`idOrder`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- RN-44: los ajustes de puntos llevan motivo y responsable.
ALTER TABLE `loyalty_transactions`
    ADD COLUMN `reason` TEXT NULL,
    ADD COLUMN `responsible` VARCHAR(100) NULL;

-- Llaves foráneas.
ALTER TABLE `flavors` ADD CONSTRAINT `flavors_idDrinkType_fkey`
    FOREIGN KEY (`idDrinkType`) REFERENCES `drink_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `beverages` ADD CONSTRAINT `beverages_idDrinkType_fkey`
    FOREIGN KEY (`idDrinkType`) REFERENCES `drink_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `beverages` ADD CONSTRAINT `beverages_idFlavor_fkey`
    FOREIGN KEY (`idFlavor`) REFERENCES `flavors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `recipes` ADD CONSTRAINT `recipes_idBeverage_fkey`
    FOREIGN KEY (`idBeverage`) REFERENCES `beverages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `recipe_items` ADD CONSTRAINT `recipe_items_idRecipe_fkey`
    FOREIGN KEY (`idRecipe`) REFERENCES `recipes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `recipe_items` ADD CONSTRAINT `recipe_items_idIngredient_fkey`
    FOREIGN KEY (`idIngredient`) REFERENCES `ingredients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_idIngredient_fkey`
    FOREIGN KEY (`idIngredient`) REFERENCES `ingredients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `payments` ADD CONSTRAINT `payments_idOrder_fkey`
    FOREIGN KEY (`idOrder`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

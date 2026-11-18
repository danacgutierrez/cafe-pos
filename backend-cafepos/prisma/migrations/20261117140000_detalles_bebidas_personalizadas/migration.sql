-- Una línea de pedido puede venir del catálogo (idProduct) o del menú
-- personalizado (idBeverage + customization). El precio sigue congelado
-- en `price`, calculado siempre por el sistema.
ALTER TABLE `order_details`
    MODIFY COLUMN `idProduct` INTEGER NULL,
    ADD COLUMN `idBeverage` INTEGER NULL,
    ADD COLUMN `customization` TEXT NULL,
    ADD INDEX `order_details_idBeverage_idx`(`idBeverage`);

-- Las bebidas dadas de baja conservan su historial (baja lógica, RN-04).
ALTER TABLE `order_details` ADD CONSTRAINT `order_details_idBeverage_fkey`
    FOREIGN KEY (`idBeverage`) REFERENCES `beverages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

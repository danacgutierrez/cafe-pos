-- Más opciones activas del catálogo para que el cliente pueda elegir
-- tamaño, leche, endulzante y extras de verdad (RN-01, RN-02, RN-06, RN-07).
-- INSERT IGNORE mantiene la migración segura si el seed ya creó estos ids.
INSERT IGNORE INTO `menu_options` (`id`, `kind`, `name`, `surcharge`, `isActive`) VALUES
    (5, 'SIZE', 'Pequeño', 0, TRUE),
    (6, 'SIZE', 'Mediano', 0.5, TRUE),
    (7, 'MILK', 'Leche entera', 0, TRUE),
    (8, 'MILK', 'Leche de almendra', 1, TRUE),
    (9, 'SWEETENER', 'Azúcar', 0, TRUE),
    (10, 'SWEETENER', 'Sin endulzante', 0, TRUE),
    (11, 'EXTRA', 'Chocolate', 0.75, TRUE),
    (12, 'EXTRA', 'Canela', 0.25, TRUE);

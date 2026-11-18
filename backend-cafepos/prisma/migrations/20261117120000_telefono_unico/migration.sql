-- RN-51: dos clientes no pueden compartir el mismo telefono.
CREATE UNIQUE INDEX `clients_phoneNumber_key` ON `clients`(`phoneNumber`);

import { InMemoryOrderRepository } from './src/InMemoryOrderRepository';
import { InMemoryProductRepository } from './src/InMemoryProductRepository';
import { Client, Product} from './src/entidades';
import { OrderService } from './src/order.service';

function runScenarios() {
    console.log("--- INICIANDO PRUEBAS DE DOMINIO ---\n");

    // Preparar datos iniciales
    const cafeAmericano = { name: "Café Americano", price: 35, description: "Café negro", isActive: true } as Product;
    const frappeFresa = { name: "Frappé de Fresa", price: 65, description: "Frappé temporada", isActive: false } as Product; // INACTIVO
    // 
    const client = new Client();
    client.firstName = "Juan";
    client.lastName = "Pérez";

    // Inyectar dependencias
    const productRepo = new InMemoryProductRepository([cafeAmericano, frappeFresa]);
    const orderRepo = new InMemoryOrderRepository();
    const orderService = new OrderService(orderRepo, productRepo);

    // Escenario 1: Camino feliz (Funciona)
    try {
        console.log("Escenario 1: Creando un pedido válido...");
        orderService.createOrder(client, [
            { productName: "Café Americano", quantity: 2, price: 35 }
        ]);
        console.log("✅ Escenario 1 Exitoso.\n");
    } catch (error: any) {
        console.error(`❌ Error inesperado: ${error.message}\n`);
    }

    // Escenario 2: Rechazo por Regla 1 (Pedido Vacío)
    try {
        console.log("Escenario 2: Intentando crear un pedido sin productos...");
        orderService.createOrder(client, []);
        console.log("❌ Error: El sistema debió rechazar el pedido vacío.\n");
    } catch (error: any) {
        console.log(`✅ Escenario 2 Exitoso (Rechazado correctamente): ${error.message}\n`);
    }

    // Escenario 3: Rechazo por Regla 2 (Producto Inactivo)
    try {
        console.log("Escenario 3: Intentando comprar un producto inactivo (Frappé de Fresa)...");
        orderService.createOrder(client, [
            { productName: "Frappé de Fresa", quantity: 1, price: 65 }
        ]);
        console.log("❌ Error: El sistema debió rechazar el producto inactivo.\n");
    } catch (error: any) {
        console.log(`✅ Escenario 3 Exitoso (Rechazado correctamente): ${error.message}\n`);
    }
}

// Ejecutar
runScenarios();
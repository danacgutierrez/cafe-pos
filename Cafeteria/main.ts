import { InMemoryOrderRepository } from './src/InMemoryOrderRepository';
import { InMemoryProductRepository } from './src/InMemoryProductRepository';
import { Client, Product } from './src/entidades';
import { OrderService } from './src/order.service';
import {
    EmptyOrderError,
    InactiveProductError,
    ProductNotFoundError,
    InvalidQuantityError
} from './src/errores';

function runScenarios(): void {
    console.log("--- INICIANDO PRUEBAS DE DOMINIO ---\n");

    const cafeAmericano = {
        id: 1,
        name: "Café Americano",
        price: 35,
        description: "Café negro",
        isActive: true
    } as Product;

    const frappeFresa = {
        id: 2,
        name: "Frappé de Fresa",
        price: 65,
        description: "Frappé temporada",
        isActive: false
    } as Product;

    const client = new Client();
    client.id = 1;
    client.firstName = "Juan";
    client.lastName = "Pérez";

    const productRepo = new InMemoryProductRepository([
        cafeAmericano,
        frappeFresa
    ]);

    const orderRepo = new InMemoryOrderRepository();
    const orderService = new OrderService(orderRepo, productRepo);

    let passed = 0;
    let failed = 0;

    function check(
        name: string,
        action: () => void,
        expectedError?: new (...args: any[]) => Error
    ): void {
        try {
            action();

            if (expectedError) {
                throw new Error("No se lanzó el error esperado.");
            }

            console.log(`✅ ${name}`);
            passed++;
        } catch (error) {
            if (expectedError && error instanceof expectedError) {
                console.log(`✅ ${name}: ${error.message}`);
                passed++;
            } else {
                console.error(`❌ ${name}:`, error);
                failed++;
            }
        }
    }

    check("Escenario 1: Pedido válido", () => {
        const order = orderService.createOrder(client, [
            { productId: 1, quantity: 2 }
        ]);

        if (order.total !== 70) {
            throw new Error("El total del pedido es incorrecto.");
        }

        if (order.orderDetails[0].order !== order) {
            throw new Error("La relación del detalle con el pedido es incorrecta.");
        }
    });

    check("Escenario 2: Pedido vacío", () => {
        orderService.createOrder(client, []);
    }, EmptyOrderError);

    check("Escenario 3: Producto inactivo", () => {
        orderService.createOrder(client, [
            { productId: 2, quantity: 1 }
        ]);
    }, InactiveProductError);

    check("Escenario 4: Producto inexistente", () => {
        orderService.createOrder(client, [
            { productId: 999, quantity: 1 }
        ]);
    }, ProductNotFoundError);

    check("Escenario 5: Cantidad cero", () => {
        orderService.createOrder(client, [
            { productId: 1, quantity: 0 }
        ]);
    }, InvalidQuantityError);

    check("Escenario 6: Cantidad negativa", () => {
        orderService.createOrder(client, [
            { productId: 1, quantity: -2 }
        ]);
    }, InvalidQuantityError);

    check("Escenario 7: Cantidad decimal", () => {
        orderService.createOrder(client, [
            { productId: 1, quantity: 1.5 }
        ]);
    }, InvalidQuantityError);

    console.log(`\nResultado: ${passed} correctos, ${failed} fallidos.`);

    if (failed > 0) {
        process.exitCode = 1;
    }
}

runScenarios();
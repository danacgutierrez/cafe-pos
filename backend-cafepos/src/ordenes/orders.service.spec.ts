import { PayloadJwt, Rol } from '../auth/dominio/usuario';
import {
    DeliveryMode,
    EarnMode,
    FulfillmentType,
    LoyaltyProgram,
    Order,
    OrderStatus,
} from './dominio/entidades';
import { InvalidOrderDetailError, EmptyOrderError, NonClientFoundError } from './dominio/errores';
import { OrdersService } from './orders.service';

const clientePayload = (idClient: number | null = 1): PayloadJwt => ({
    sub: 1,
    correo: 'cliente@itson.mx',
    rol: Rol.client,
    idClient,
});

describe('OrdersService', () => {
    function build() {
        const repo = {
            findProduct: jest.fn().mockResolvedValue({ id: 2, name: 'Pastel', price: 3, isActive: true }),
            findClientById: jest.fn().mockResolvedValue({ id: 1, loyaltyBalance: 20 }),
            findLoyaltyProgramActive: jest.fn().mockResolvedValue({
                id: 1,
                isActive: true,
                earnMode: EarnMode.PER_ORDER,
                earnValue: 2,
                redeemMode: 'DISCOUNT',
                pointsPerReward: 10,
                pointValue: 1,
            } as LoyaltyProgram),
            updateClientBalance: jest.fn().mockResolvedValue(undefined),
            save: jest.fn().mockImplementation(async (o) => ({ ...o, id: 99, status: OrderStatus.PENDING })),
            findAll: jest.fn(),
            findByClient: jest.fn().mockResolvedValue([]),
            findById: jest.fn(),
            cancel: jest.fn(),
            completeOrder: jest.fn(),
            completeOrderWithPoints: jest.fn(),
        };
        const menuService = {
            quote: jest.fn().mockResolvedValue({ total: 7.75 }),
        };
        return { service: new OrdersService(repo as any, menuService as any), repo, menuService };
    }

    const baseDto = {
        idClient: 1,
        deliveryMode: DeliveryMode.PICKUP,
        fulfillmentType: FulfillmentType.IMMEDIATE,
    };

    describe('createOrder', () => {
        it('rechaza un pedido sin líneas', async () => {
            const { service } = build();
            await expect(service.createOrder({ ...baseDto, details: [] } as any)).rejects.toBeInstanceOf(
                EmptyOrderError,
            );
        });

        it('rechaza una línea con idProduct e idBeverage a la vez', async () => {
            const { service } = build();
            await expect(
                service.createOrder({
                    ...baseDto,
                    details: [{ idProduct: 1, idBeverage: 1, quantity: 1 }],
                } as any),
            ).rejects.toBeInstanceOf(InvalidOrderDetailError);
        });

        it('usa el precio cotizado por MenuService para bebidas personalizadas', async () => {
            const { service, menuService, repo } = build();
            const customization = { sizeId: 1, milkId: 2, sweetness: 50 };

            const order = await service.createOrder({
                ...baseDto,
                details: [{ idBeverage: 1, quantity: 2, customization }],
            } as any);

            expect(menuService.quote).toHaveBeenCalledWith({ idBeverage: 1, customization });
            expect(order.total).toBeCloseTo(15.5, 2); // 7.75 * 2
            const savedDetail = repo.save.mock.calls[0][0].orderDetails[0];
            expect(savedDetail.idBeverage).toBe(1);
            expect(savedDetail.customization).toBe(JSON.stringify(customization));
            expect(savedDetail.idProduct).toBeUndefined();
        });

        it('usa el precio congelado del producto para líneas de producto', async () => {
            const { service, menuService } = build();

            const order = await service.createOrder({
                ...baseDto,
                details: [{ idProduct: 2, quantity: 3 }],
            } as any);

            expect(menuService.quote).not.toHaveBeenCalled();
            expect(order.total).toBeCloseTo(9, 2); // 3 * 3
        });

        it('rechaza un cliente inexistente', async () => {
            const { service, repo } = build();
            repo.findClientById.mockResolvedValue(null);
            await expect(
                service.createOrder({ ...baseDto, details: [{ idProduct: 2, quantity: 1 }] } as any),
            ).rejects.toBeInstanceOf(NonClientFoundError);
        });
    });

    describe('findMine', () => {
        it('devuelve solo los pedidos del cliente autenticado', async () => {
            const { service, repo } = build();
            const pedidos = [{ id: 1 }, { id: 2 }] as Order[];
            repo.findByClient.mockResolvedValue(pedidos);

            await expect(service.findMine(clientePayload(1))).resolves.toBe(pedidos);
            expect(repo.findByClient).toHaveBeenCalledWith(1);
        });

        it('falla si un cliente no tiene idClient vinculado', async () => {
            const { service, repo } = build();
            await expect(service.findMine(clientePayload(null))).rejects.toBeInstanceOf(NonClientFoundError);
            expect(repo.findByClient).not.toHaveBeenCalled();
        });

        it('un staff sin idClient obtiene una lista vacía', async () => {
            const { service, repo } = build();
            const staff: PayloadJwt = { sub: 9, correo: 'staff@itson.mx', rol: Rol.staff, idClient: null };
            await expect(service.findMine(staff)).resolves.toEqual([]);
            expect(repo.findByClient).not.toHaveBeenCalled();
        });
    });

    describe('cancel', () => {
        it('no permite cancelar un pedido que ya está en preparación', async () => {
            const { service, repo } = build();
            repo.findById.mockResolvedValue({ id: 1, status: OrderStatus.IN_PROGRESS });
            await expect(service.cancel(1)).rejects.toBeDefined();
            expect(repo.cancel).not.toHaveBeenCalled();
        });

        it('cancela un pedido recién recibido (PENDING)', async () => {
            const { service, repo } = build();
            repo.findById.mockResolvedValue({ id: 1, status: OrderStatus.PENDING });
            repo.cancel.mockResolvedValue({ id: 1, status: OrderStatus.CANCELLED });
            await expect(service.cancel(1)).resolves.toMatchObject({ status: OrderStatus.CANCELLED });
        });
    });

    describe('complete', () => {
        it('no permite completar un pedido que no está READY', async () => {
            const { service, repo } = build();
            repo.findById.mockResolvedValue({ id: 1, status: OrderStatus.PENDING });
            await expect(service.complete(1)).rejects.toBeDefined();
            expect(repo.completeOrder).not.toHaveBeenCalled();
        });

        it('otorga puntos fijos (PER_ORDER) al completar desde READY', async () => {
            const { service, repo } = build();
            repo.findById.mockResolvedValue({ id: 1, status: OrderStatus.READY, idClient: 1, total: 10 });
            const terminado = { id: 1, status: OrderStatus.COMPLETED };
            repo.completeOrderWithPoints.mockResolvedValue(terminado);

            await expect(service.complete(1)).resolves.toBe(terminado);
            expect(repo.completeOrderWithPoints).toHaveBeenCalledWith(1, 1, 1, 2, 22);
            expect(repo.completeOrder).not.toHaveBeenCalled();
        });
    });
});

// Se corre con: npx prisma db seed
import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generado/prisma/client';
import * as bcrypt from 'bcryptjs';

const u = new URL(process.env.DATABASE_URL!);
const adapter = new PrismaMariaDb({
  host: u.hostname,
  port: Number(u.port || 3306),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: u.pathname.replace(/^\//, ''),
  allowPublicKeyRetrieval: true,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Hijos primero para no violar llaves foráneas.
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderDetail.deleteMany();
  await prisma.order.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.beverage.deleteMany();
  await prisma.flavor.deleteMany();
  await prisma.drinkType.deleteMany();
  await prisma.menuOption.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.client.deleteMany();
  await prisma.product.deleteMany();
  await prisma.loyaltyProgram.deleteMany();

  await prisma.product.createMany({
    data: [
      { id: 1, name: 'Frappe', price: 8.5, description: '', isActive: true },
      { id: 2, name: 'Café americano', price: 3.0, description: '', isActive: true },
      { id: 3, name: 'Matcha', price: 2.0, description: '', isActive: true },
    ],
  });

  await prisma.loyaltyProgram.create({
    data: {
      id: 1,
      name: 'Cliente Frecuente',
      isActive: true,
      earnMode: 'PER_ORDER',
      earnValue: 1,
      redeemMode: 'FREE_ITEM',
      pointsPerReward: 9,
      pointValue: 0,
    },
  });

  await prisma.client.createMany({
    data: [
      { id: 1, firstName: 'Karla', lastName: 'Duarte', loyaltyBalance: 20, phoneNumber: '1' },
      { id: 2, firstName: 'Sofia', lastName: 'Ibarra', loyaltyBalance: 0, phoneNumber: '2' },
    ],
  });

  // Menú configurable (RN-01 a RN-08). La receta base no incluye leche (RN-26).
  await prisma.drinkType.create({ data: { id: 1, name: 'Café' } });
  await prisma.flavor.create({ data: { id: 1, idDrinkType: 1, name: 'Vainilla' } });
  await prisma.menuOption.createMany({
    data: [
      { id: 1, kind: 'SIZE', name: 'Grande', surcharge: 1.0 },
      { id: 2, kind: 'MILK', name: 'Leche de avena', surcharge: 0.75 },
      { id: 3, kind: 'SWEETENER', name: 'Stevia', surcharge: 0 },
      { id: 4, kind: 'EXTRA', name: 'Crema', surcharge: 0.5 },
      { id: 5, kind: 'SIZE', name: 'Pequeño', surcharge: 0 },
      { id: 6, kind: 'SIZE', name: 'Mediano', surcharge: 0.5 },
      { id: 7, kind: 'MILK', name: 'Leche entera', surcharge: 0 },
      { id: 8, kind: 'MILK', name: 'Leche de almendra', surcharge: 1.0 },
      { id: 9, kind: 'SWEETENER', name: 'Azúcar', surcharge: 0 },
      { id: 10, kind: 'SWEETENER', name: 'Sin endulzante', surcharge: 0 },
      { id: 11, kind: 'EXTRA', name: 'Chocolate', surcharge: 0.75 },
      { id: 12, kind: 'EXTRA', name: 'Canela', surcharge: 0.25 },
    ],
  });

  await prisma.ingredient.createMany({
    data: [
      { id: 1, name: 'Café molido', stock: 1000, minStock: 200 },
      { id: 2, name: 'Leche', stock: 500, minStock: 100 },
      { id: 3, name: 'Vaso', stock: 200, minStock: 50 },
    ],
  });

  await prisma.beverage.create({
    data: {
      id: 1,
      name: 'Latte de vainilla',
      idDrinkType: 1,
      idFlavor: 1,
      basePrice: 5.5,
      isActive: true,
      allowsMilk: true,
    },
  });
  await prisma.recipe.create({ data: { id: 1, idBeverage: 1 } });
  await prisma.recipeItem.createMany({
    data: [
      { id: 1, idRecipe: 1, idIngredient: 1, baseQuantity: 18 },
      { id: 2, idRecipe: 1, idIngredient: 3, baseQuantity: 1 },
    ],
  });
  await prisma.inventoryMovement.create({
    data: {
      id: 1,
      idIngredient: 1,
      movementType: 'ENTRY',
      quantity: 1000,
      balanceAfter: 1000,
      reason: 'Carga inicial',
      responsible: 'seed',
    },
  });

  const passwordHash = await bcrypt.hash('cafeteria2026', 10);

  await prisma.usuario.createMany({
    data: [
      { correo: 'karla@itson.mx', passwordHash, rol: 'client', idClient: 1 },
      { correo: 'ana@itson.mx', passwordHash, rol: 'client' },
      { correo: 'barista@itson.mx', passwordHash, rol: 'staff' },
      { correo: 'admin@itson.mx', passwordHash, rol: 'admin' },
    ],
  });

  await prisma.order.create({
    data: {
      id: 1,
      idClient: 1,
      scheduleTime: new Date(),
      total: 19.0,
      deliveryMode: 'PICKUP',
      fulfillmentType: 'IMMEDIATE',
      status: 'PENDING',
      orderDetails: {
        create: [
          { idProduct: 1, quantity: 2, price: 8.5 },
          { idProduct: 3, quantity: 1, price: 2.0 },
        ],
      },
    },
  });

  console.log(
    `Seed listo: ${await prisma.product.count()} productos, ` +
    `${await prisma.loyaltyProgram.count()} programas, ` +
    `${await prisma.client.count()} clientes, ` +
    `${await prisma.usuario.count()} usuarios.`
  );
}

main()
  .catch((e) => {
    console.error('El seed falló:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

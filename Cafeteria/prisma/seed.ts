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
  await prisma.usuario.deleteMany();
  await prisma.orderDetail.deleteMany();
  await prisma.order.deleteMany();
  await prisma.client.deleteMany();
  await prisma.product.deleteMany();

  await prisma.product.createMany({
    data: [
      { id: 1, name: 'Hamburguesa Clásica', price: 8.5, description: '', isActive: true },
      { id: 2, name: 'Papas Fritas', price: 3.0, description: '', isActive: true },
      { id: 3, name: 'Bebida Mediana', price: 2.0, description: '', isActive: true },
    ],
  });

  await prisma.client.createMany({
    data: [
      { id: 1, firstName: 'Karla', lastName: 'Duarte', loyaltyBalance: 0, phoneNumber: '1' },
      { id: 2, firstName: 'Sofia', lastName: 'Ibarra', loyaltyBalance: 0, phoneNumber: '2' },
    ],
  });

  const passwordHash = await bcrypt.hash('cafeteria2026', 10); 
  
  await prisma.usuario.createMany({
    data: [
      { correo: 'karla@itson.mx', passwordHash, rol: 'client', idClient: 1 },
      { correo: 'ana@itson.mx', passwordHash, rol: 'client' },
      { correo: 'admin@itson.mx', passwordHash, rol: 'admin' },
    ],
  });

  console.log(
    `Seed listo: ${await prisma.product.count()} productos, ` +
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
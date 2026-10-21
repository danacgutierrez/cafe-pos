import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service'; 
import { ProductRepository } from '../dominio/product.repository'; 
import { Product } from '../dominio/entidades'; 

@Injectable()
export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<Product | null> {
    const productBd = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!productBd) {
      return null;
    }

    return productBd as Product;
  }

  async findAll(): Promise<Product[]> {
    const productsBd = await this.prisma.product.findMany({
    });

    return productsBd as Product[];
  }
}
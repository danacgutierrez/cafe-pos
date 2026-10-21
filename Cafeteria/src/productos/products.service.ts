import { Inject, Injectable } from '@nestjs/common';
import { PRODUCT_REPOSITORY } from './products.tokens';
import type { ProductRepository } from './dominio/product.repository';
import { Product } from './dominio/entidades';

@Injectable()
export class ProductsService {
    constructor(
        @Inject(PRODUCT_REPOSITORY)
        private readonly repo: ProductRepository,
    ) {}

    findById(id: number): Promise<Product | null> {
        return this.repo.findById(id);
    }

    findAll(): Promise<Product[]> {
        return this.repo.findAll();
    }
}
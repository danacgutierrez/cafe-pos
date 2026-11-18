import { Injectable } from '@nestjs/common';
import { Client } from '../dominio/entidades';
import { ClientRepository } from '../dominio/client.repository';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PrismaClientRepository implements ClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<Client | null> {
    const clientBd = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!clientBd) {
      return null;
    }

    return clientBd as Client;
  }

  async findByPhone(phoneNumber: string): Promise<Client | null> {
    const clientBd = await this.prisma.client.findUnique({
      where: { phoneNumber },
    });

    return clientBd ? (clientBd as Client) : null;
  }

  async findAll(): Promise<Client[]> {
    const clientsBd = await this.prisma.client.findMany();

    return clientsBd as Client[];
  }
}
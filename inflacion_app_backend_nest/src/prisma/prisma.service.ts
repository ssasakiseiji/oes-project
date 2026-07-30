import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Prisma 7 configura la conexión vía "driver adapter" en el constructor en
// vez de `url` en schema.prisma. DB_SSL=false replica la misma variable que
// usa inflacion_app_backend/config/database.js (true por defecto, para el
// pooler de Supabase; false en la red interna de Docker de un VPS).
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const useSsl = process.env.DB_SSL !== 'false';

    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        ssl: useSsl ? { rejectUnauthorized: false } : false,
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

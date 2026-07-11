import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { CommercesModule } from './commerces/commerces.module';
import { CommerceAssignmentsModule } from './commerce-assignments/commerce-assignments.module';
import { StudentsModule } from './students/students.module';
import { MonitorModule } from './monitor/monitor.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    CommercesModule,
    CommerceAssignmentsModule,
    StudentsModule,
    MonitorModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

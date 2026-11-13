import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { VendorModule } from './vendor/vendor.module';
import { AdminModule } from './admin/admin.module';
import { CommerceModule } from './commerce/commerce.module';
import { DeliveryModule } from './delivery/delivery.module';
import { ClassifiedsModule } from './classifieds/classifieds.module';
import { EmergencyModule } from './emergency/emergency.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, CatalogModule, VendorModule, AdminModule, CommerceModule, DeliveryModule, ClassifiedsModule, EmergencyModule],
  controllers: [HealthController],
})
export class AppModule {}

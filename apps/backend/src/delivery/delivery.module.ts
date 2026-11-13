import { Module } from '@nestjs/common';
import { DeliveryController } from './delivery.controller';
import { RolesGuard } from '../auth/roles.guard';
@Module({ controllers: [DeliveryController], providers: [RolesGuard] })
export class DeliveryModule {}

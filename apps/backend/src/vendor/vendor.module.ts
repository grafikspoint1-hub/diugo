import { Module } from '@nestjs/common';
import { VendorController } from './vendor.controller';
import { RolesGuard } from '../auth/roles.guard';
import { SellerSubscriptionService } from './seller-subscription.service';
@Module({ controllers: [VendorController], providers: [RolesGuard, SellerSubscriptionService] })
export class VendorModule {}

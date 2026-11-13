import { Module } from '@nestjs/common';
import { CommerceController } from './commerce.controller';
import { CommerceService } from './commerce.service';
import { PaymentWebhookController } from './payment-webhook.controller';

@Module({ controllers: [CommerceController, PaymentWebhookController], providers: [CommerceService] })
export class CommerceModule {}

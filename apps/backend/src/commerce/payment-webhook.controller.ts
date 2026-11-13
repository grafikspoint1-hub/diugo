import { Controller, Headers, Post, Req } from '@nestjs/common';
import { CommerceService } from './commerce.service';

@Controller('payments/webhooks')
export class PaymentWebhookController {
  constructor(private readonly commerce: CommerceService) {}

  @Post('razorpay')
  handleRazorpay(@Req() req: any, @Headers('x-razorpay-signature') signature?: string) {
    return this.commerce.acceptWebhook(req.rawBody as Buffer | undefined, signature);
  }
}

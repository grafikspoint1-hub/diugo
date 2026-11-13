import { BadRequestException, ConflictException, Controller, Get, Param, Patch, Body, Req, UseGuards, NotFoundException } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

const transitions: Record<string,string[]> = {
  ACCEPTED: ['AT_PICKUP','CANCELLED'],
  AT_PICKUP: ['PICKED_UP','FAILED'],
  PICKED_UP: ['IN_TRANSIT','FAILED'],
  IN_TRANSIT: ['DELIVERED','FAILED']
};

class UpdateDeliveryStatusDto {
  @IsIn(['AT_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED'])
  status!: string;
}

@Controller('delivery')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.DELIVERY_PARTNER)
export class DeliveryController {
  constructor(private prisma: PrismaService) {}

  @Get('jobs')
  async jobs(@Req() req: any) {
    return this.prisma.delivery.findMany({
      where: { AND: [{ order: { status: { not: 'PENDING_PAYMENT' } } }, { OR: [{ status: 'UNASSIGNED', partnerId: null }, { partnerId: req.user.id, status: { in: ['ASSIGNED','ACCEPTED','AT_PICKUP','PICKED_UP','IN_TRANSIT'] } }] }] },
      include: { order: { include: { business: true, items: true } } }, orderBy: { createdAt: 'asc' }
    });
  }

  @Patch('jobs/:id/accept')
  async accept(@Req() req: any, @Param('id') id: string) {
    const result = await this.prisma.delivery.updateMany({
      where: { id, status: 'UNASSIGNED', partnerId: null },
      data: { partnerId: req.user.id, status: 'ACCEPTED', assignedAt: new Date() }
    });
    if (result.count !== 1) throw new ConflictException('This delivery job is no longer available');
    return this.prisma.delivery.findUnique({ where: { id }, include: { order: { include: { business: true, items: true } } } });
  }

  @Patch('jobs/:id/status')
  async updateStatus(@Req() req: any, @Param('id') id: string, @Body() body: UpdateDeliveryStatusDto) {
    const delivery = await this.prisma.delivery.findFirst({ where: { id, partnerId: req.user.id } });
    if (!delivery) throw new NotFoundException('Delivery job not found');
    const allowed = transitions[delivery.status] || [];
    if (!allowed.includes(body.status)) throw new BadRequestException(`Invalid delivery transition from ${delivery.status} to ${body.status}`);
    const now = new Date();
    return this.prisma.$transaction(async (tx: any) => {
      const claimed = await tx.delivery.updateMany({ where: { id, partnerId: req.user.id, status: delivery.status }, data: {
        status: body.status,
        ...(body.status === 'PICKED_UP' ? { pickedUpAt: now } : {}),
        ...(body.status === 'DELIVERED' ? { deliveredAt: now } : {}),
      } });
      if (claimed.count !== 1) throw new ConflictException('This delivery changed. Refresh your jobs and try again.');
      if (body.status === 'PICKED_UP') await tx.order.update({ where: { id: delivery.orderId }, data: { status: 'PICKED_UP' } });
      if (body.status === 'IN_TRANSIT') await tx.order.update({ where: { id: delivery.orderId }, data: { status: 'OUT_FOR_DELIVERY' } });
      if (body.status === 'DELIVERED') await tx.order.update({ where: { id: delivery.orderId }, data: { status: 'DELIVERED' } });
      return tx.delivery.findUnique({ where: { id } });
    });
  }
}

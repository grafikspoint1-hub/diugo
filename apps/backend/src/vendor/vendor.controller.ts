import { Body, Controller, Get, Post, Req, UseGuards, ConflictException, Param, Patch, NotFoundException, Delete, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { VerifySellerSubscriptionDto } from './dto/verify-seller-subscription.dto';
import { UpdateDeliverySettingsDto } from './dto/update-delivery-settings.dto';
import { SellerSubscriptionService } from './seller-subscription.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '@prisma/client';
import { ProductCondition } from '@prisma/client';
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
@Controller('vendor')
@UseGuards(AuthGuard('jwt'))
export class VendorController {
  constructor(private prisma: PrismaService, private subscriptions: SellerSubscriptionService) {}

  @Get('subscription')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  subscriptionStatus(@Req() req: any) {
    return this.subscriptions.status(req.user.id);
  }

  @Post('subscription/checkout')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  startSubscriptionCheckout(@Req() req: any) {
    return this.subscriptions.createCheckout(req.user.id);
  }

  @Post('subscription/verify')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  verifySubscriptionPayment(@Req() req: any, @Body() dto: VerifySellerSubscriptionDto) {
    return this.subscriptions.verifyCheckout(req.user.id, dto);
  }

  @Post('businesses')
  async createBusiness(@Req() req: any, @Body() dto: CreateBusinessDto) {
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Category not found');
    const existing = await this.prisma.business.findFirst({ where: { ownerId: req.user.id } });
    if (existing) throw new ConflictException('A business profile already exists for this account');
    const business = await this.prisma.business.create({ data: {
      ownerId: req.user.id, categoryId: dto.categoryId, name: dto.name,
      slug: `${slugify(dto.name) || 'business'}-${Date.now().toString(36)}`,
      description: dto.description, phone: dto.phone, address: dto.address, locality: dto.locality,
      supportsPickup: dto.supportsPickup ?? false, supportsDelivery: dto.supportsDelivery ?? false,
      vendorDeliveryFeePaise: dto.vendorDeliveryFeePaise,
      status: 'PENDING_VERIFICATION'
    }});
    await this.prisma.auditLog.create({ data: { actorId: req.user.id, action: 'VENDOR_BUSINESS_SUBMITTED', entityType: 'Business', entityId: business.id } });
    return { message: 'Business submitted for admin verification', business };
  }
  @Get('business')
  myBusiness(@Req() req: any) {
    return this.prisma.business.findFirst({ where: { ownerId: req.user.id }, include: { category: true, products: true } });
  }

  @Patch('business/delivery-settings')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  async updateDeliverySettings(@Req() req: any, @Body() dto: UpdateDeliverySettingsDto) {
    if (Object.keys(dto).length === 0) throw new BadRequestException('At least one delivery setting is required');
    const business = await this.prisma.business.findFirst({ where: { ownerId: req.user.id } });
    if (!business) throw new NotFoundException('Business not found');
    return this.prisma.business.update({ where: { id: business.id }, data: {
      ...(dto.supportsDelivery !== undefined ? { supportsDelivery: dto.supportsDelivery } : {}),
      ...(dto.vendorDeliveryFeePaise !== undefined ? { vendorDeliveryFeePaise: dto.vendorDeliveryFeePaise } : {}),
    } });
  }
  @Post('products')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  async createProduct(@Req() req: any, @Body() dto: CreateProductDto) {
    const business = await this.prisma.business.findFirst({ where: { ownerId: req.user.id, status: 'APPROVED' } });
    if (!business) throw new ConflictException('Your business must be approved before adding products');
    if (!(await this.subscriptions.hasActiveSubscription(business.id))) {
      throw new ConflictException('An active MY DIU seller subscription is required to add products');
    }
    const category = dto.categoryId ? await this.prisma.category.findUnique({ where: { id: dto.categoryId } }) : null;
    if (dto.categoryId && !category) throw new NotFoundException('Category not found');
    const condition = dto.condition ?? ProductCondition.NEW;
    if (category?.slug === 'buy-sell' && condition === ProductCondition.NEW) {
      throw new BadRequestException('Buy & Sell listings must be pre-owned; choose Like new, Good or Fair condition');
    }
    if (dto.mrpPaise !== undefined && dto.mrpPaise < dto.pricePaise) {
      throw new BadRequestException('MRP must be equal to or greater than the selling price');
    }
    if ((dto.stock ?? 0) === 0 && dto.status === 'ACTIVE') {
      throw new BadRequestException('A product with zero stock cannot be activated');
    }
    return this.prisma.product.create({ data: { businessId: business.id, categoryId: dto.categoryId,
      name: dto.name, slug: `${slugify(dto.name)}-${Date.now().toString(36)}`, description: dto.description,
      pricePaise: dto.pricePaise, mrpPaise: dto.mrpPaise, stock: dto.stock ?? 0,
      imageUrl: dto.imageUrl, condition, status: dto.status ?? ((dto.stock ?? 0) > 0 ? 'ACTIVE' : 'OUT_OF_STOCK') } });
  }
  @Get('products')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  async myProducts(@Req() req: any) {
    const business = await this.prisma.business.findFirst({ where: { ownerId: req.user.id } });
    if (!business) return [];
    return this.prisma.product.findMany({ where: { businessId: business.id }, orderBy: { createdAt: 'desc' } });
  }
  @Patch('products/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  async updateProduct(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    if (Object.keys(dto).length === 0) throw new BadRequestException('At least one product field is required');
    const business = await this.prisma.business.findFirst({ where: { ownerId: req.user.id, status: 'APPROVED' } });
    if (!business) throw new NotFoundException('Business not found');
    if (!(await this.subscriptions.hasActiveSubscription(business.id))) {
      throw new ConflictException('An active MY DIU seller subscription is required to edit products');
    }
    const product = await this.prisma.product.findFirst({ where: { id, businessId: business.id } });
    if (!product) throw new NotFoundException('Product not found');
    if (dto.stock !== undefined && dto.stock < product.reservedStock) {
      throw new ConflictException('Stock cannot be reduced below the quantity currently reserved for checkout');
    }
    const category = dto.categoryId !== undefined
      ? await this.prisma.category.findUnique({ where: { id: dto.categoryId } })
      : product.categoryId ? await this.prisma.category.findUnique({ where: { id: product.categoryId } }) : null;
    if (dto.categoryId && !category) throw new NotFoundException('Category not found');
    const nextCondition = dto.condition ?? product.condition;
    if (category?.slug === 'buy-sell' && nextCondition === ProductCondition.NEW) {
      throw new BadRequestException('Buy & Sell listings must be pre-owned; choose Like new, Good or Fair condition');
    }
    const nextPrice = dto.pricePaise ?? product.pricePaise;
    const nextMrp = dto.mrpPaise ?? product.mrpPaise;
    if (nextMrp !== null && nextMrp !== undefined && nextMrp < nextPrice) {
      throw new BadRequestException('MRP must be equal to or greater than the selling price');
    }
    const nextStock = dto.stock ?? product.stock;
    const nextStatus = nextStock <= product.reservedStock
      ? 'OUT_OF_STOCK'
      : dto.status ?? (product.status === 'OUT_OF_STOCK' ? 'ACTIVE' : product.status);
    return this.prisma.product.update({ where: { id }, data: {
      ...(dto.name !== undefined ? { name: dto.name, slug: `${slugify(dto.name)}-${Date.now().toString(36)}` } : {}), ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.pricePaise !== undefined ? { pricePaise: dto.pricePaise } : {}),
      ...(dto.mrpPaise !== undefined ? { mrpPaise: dto.mrpPaise } : {}),
      ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
      ...(dto.condition !== undefined ? { condition: dto.condition } : {}),
      ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}), status: nextStatus
    }});
  }

  @Delete('products/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  async deleteProduct(@Req() req: any, @Param('id') id: string) {
    const business = await this.prisma.business.findFirst({ where: { ownerId: req.user.id, status: 'APPROVED' } });
    if (!business) throw new NotFoundException('Business not found');
    const product = await this.prisma.product.findFirst({ where: { id, businessId: business.id } });
    if (!product) throw new NotFoundException('Product not found');
    return this.prisma.product.update({ where: { id }, data: { status: 'INACTIVE' } });
  }


  @Get('orders')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  async vendorOrders(@Req() req: any) {
    const business = await this.prisma.business.findFirst({ where: { ownerId: req.user.id } });
    if (!business) return [];
    return this.prisma.order.findMany({ where: { businessId: business.id }, include: { customer: { select: { id: true, name: true, phone: true } }, items: true, delivery: true }, orderBy: { createdAt: 'desc' } });
  }

  @Patch('orders/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  async updateOrderStatus(@Req() req: any, @Param('id') id: string, @Body() body: { status: string }) {
    const business = await this.prisma.business.findFirst({ where: { ownerId: req.user.id } });
    if (!business) throw new NotFoundException('Business not found');
    const order = await this.prisma.order.findFirst({ where: { id, businessId: business.id } });
    if (!order) throw new NotFoundException('Order not found');
    const transitions: Record<string,string[]> = {
      PAID: ['ACCEPTED','CANCELLED'],
      ACCEPTED: ['PREPARING','CANCELLED'],
      PREPARING: ['READY_FOR_PICKUP'],
      READY_FOR_PICKUP: ['OUT_FOR_DELIVERY','DELIVERED']
    };
    if (!(transitions[order.status] || []).includes(body.status)) throw new ConflictException(`Invalid order transition from ${order.status} to ${body.status}`);
    return this.prisma.order.update({ where: { id }, data: { status: body.status as any } });
  }
}

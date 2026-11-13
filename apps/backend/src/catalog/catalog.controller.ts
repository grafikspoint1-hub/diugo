import { Controller, Get, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class CatalogController {
  constructor(private prisma: PrismaService) {}

  @Get('categories')
  categories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  @Get('businesses')
  businesses(@Query('q') q?: string, @Query('categoryId') categoryId?: string) {
    return this.prisma.business.findMany({
      where: {
        status: 'APPROVED',
        subscriptions: { some: { status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } } },
        ...(categoryId ? { categoryId } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      include: { category: true },
      orderBy: { name: 'asc' },
      take: 50,
    });
  }

  @Get('businesses/:slug')
  business(@Param('slug') slug: string) {
    return this.prisma.business.findFirst({
      where: { slug, status: 'APPROVED', subscriptions: { some: { status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } } } },
      include: { category: true, products: { where: { status: 'ACTIVE' }, take: 50 } },
    });
  }

  @Get('products')
  products(@Query('q') q?: string, @Query('categoryId') categoryId?: string) {
    return this.prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        business: { status: 'APPROVED', subscriptions: { some: { status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } } } },
        ...(categoryId ? { categoryId } : {}),
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      include: { business: { select: { id: true, name: true, slug: true } }, category: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  @Get('products/:id')
  product(@Param('id') id: string) {
    return this.prisma.product.findFirst({
      where: { id, status: 'ACTIVE', business: { status: 'APPROVED', subscriptions: { some: { status: 'ACTIVE', currentPeriodEnd: { gt: new Date() } } } } },
      include: { business: true, category: true },
    });
  }

  @Get('events')
  events() {
    return this.prisma.event.findMany({
      where: { isPublished: true, startsAt: { gte: new Date() } },
      include: { tickets: { select: { id: true, ticketType: true, pricePaise: true, quantity: true, sold: true } } },
      orderBy: { startsAt: 'asc' },
      take: 100,
    });
  }
}

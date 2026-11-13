import { Controller, Get, Patch, Param, Body, UseGuards, NotFoundException, BadRequestException, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClassifiedListingStatus, ClassifiedReportStatus, UserRole } from '@prisma/client';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

class ClassifiedReportReviewDto {
  @IsIn([ClassifiedReportStatus.RESOLVED, ClassifiedReportStatus.DISMISSED]) decision!: ClassifiedReportStatus;
  @IsOptional() @IsString() @MaxLength(1000) resolution?: string;
}

class ClassifiedListingStatusDto {
  @IsIn([ClassifiedListingStatus.ACTIVE, ClassifiedListingStatus.PAUSED, ClassifiedListingStatus.REMOVED]) status!: ClassifiedListingStatus;
}
@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private prisma: PrismaService) {}
  @Get('businesses/pending')
  pendingBusinesses() {
    return this.prisma.business.findMany({ where: { status: 'PENDING_VERIFICATION' }, include: {
      owner: { select: { id: true, name: true, email: true, phone: true } }, category: true
    }, orderBy: { createdAt: 'asc' } });
  }
  @Patch('businesses/:id/decision')
  async decideBusiness(@Req() req: any, @Param('id') id: string, @Body() body: { decision: 'APPROVE' | 'REJECT' }) {
    if (!['APPROVE', 'REJECT'].includes(body.decision)) throw new BadRequestException('Decision must be APPROVE or REJECT');
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');
    const approved = body.decision === 'APPROVE';
    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.business.update({ where: { id }, data: { status: approved ? 'APPROVED' : 'REJECTED', isVerified: approved } });
      if (approved) await tx.user.update({ where: { id: business.ownerId }, data: { role: 'VENDOR', status: 'ACTIVE' } });
      await tx.auditLog.create({ data: { actorId: req.user.id, action: approved ? 'BUSINESS_APPROVED' : 'BUSINESS_REJECTED', entityType: 'Business', entityId: id } });
      return updated;
    });
  }
  @Get('overview')
  async overview() {
    const [customers, approvedVendors, pendingVendors, products, orders, bookings] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.business.count({ where: { status: 'APPROVED' } }),
      this.prisma.business.count({ where: { status: 'PENDING_VERIFICATION' } }),
      this.prisma.product.count(), this.prisma.order.count(), this.prisma.booking.count()
    ]);
    return { customers, approvedVendors, pendingVendors, products, orders, bookings };
  }

  @Get('orders')
  orders() {
    return this.prisma.order.findMany({ include: { customer: { select: { id: true, name: true, phone: true } }, business: true, items: true, payment: true, delivery: true }, orderBy: { createdAt: 'desc' }, take: 200 });
  }

  @Get('users')
  users() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, username: true, email: true, phone: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Get('classifieds/reports')
  classifiedReports() {
    return this.prisma.classifiedReport.findMany({ where: { status: 'PENDING' }, include: {
      listing: { select: { id: true, title: true, status: true, seller: { select: { id: true, name: true } } } },
      reporter: { select: { id: true, name: true } },
    }, orderBy: { createdAt: 'asc' }, take: 200 });
  }

  @Get('classifieds')
  classifiedListings() {
    return this.prisma.classifiedListing.findMany({ include: {
      seller: { select: { id: true, name: true, email: true, phone: true } }, category: { select: { id: true, name: true, slug: true } },
    }, orderBy: { createdAt: 'desc' }, take: 200 });
  }

  @Patch('classifieds/:id/status')
  async moderateClassifiedListing(@Req() req: any, @Param('id') id: string, @Body() dto: ClassifiedListingStatusDto) {
    const listing = await this.prisma.classifiedListing.findUnique({ where: { id } });
    if (!listing) throw new NotFoundException('Classified listing not found');
    const updated = await this.prisma.classifiedListing.update({ where: { id }, data: { status: dto.status } });
    await this.prisma.auditLog.create({ data: { actorId: req.user.id, action: `CLASSIFIED_${dto.status}`, entityType: 'ClassifiedListing', entityId: id } });
    return updated;
  }

  @Patch('classifieds/reports/:id')
  async reviewClassifiedReport(@Req() req: any, @Param('id') id: string, @Body() dto: ClassifiedReportReviewDto) {
    const report = await this.prisma.classifiedReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Classified report not found');
    if (report.status !== 'PENDING') throw new BadRequestException('This report has already been reviewed');
    const hideListing = dto.decision === ClassifiedReportStatus.RESOLVED;
    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.classifiedReport.update({ where: { id }, data: {
        status: dto.decision, moderatorId: req.user.id, resolution: dto.resolution?.trim() || null, reviewedAt: new Date(),
      } });
      if (hideListing) await tx.classifiedListing.update({ where: { id: report.listingId }, data: { status: 'REMOVED' } });
      await tx.auditLog.create({ data: { actorId: req.user.id, action: hideListing ? 'CLASSIFIED_LISTING_REMOVED' : 'CLASSIFIED_REPORT_DISMISSED', entityType: 'ClassifiedReport', entityId: id } });
      return updated;
    });
  }

  @Patch('users/:id/role')
  async assignOperationalRole(@Req() req: any, @Param('id') id: string, @Body() body: { role: string }) {
    const allowed = ['DELIVERY_PARTNER','HOTEL_PARTNER','SERVICE_PROVIDER','EVENT_ORGANIZER','SUPPORT_AGENT'];
    if (!allowed.includes(body.role)) throw new BadRequestException('This endpoint cannot grant that role');
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({ where: { id }, data: { role: body.role as any, status: 'ACTIVE' } });
    await this.prisma.auditLog.create({ data: { actorId: req.user.id, action: 'OPERATIONAL_ROLE_ASSIGNED', entityType: 'User', entityId: id, metadata: { role: body.role } } });
    return { id: updated.id, role: updated.role, status: updated.status };
  }
}

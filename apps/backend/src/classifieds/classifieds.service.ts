import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ClassifiedListingStatus, ClassifiedReportStatus, ProductCondition } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { ReplyEnquiryDto } from './dto/reply-enquiry.dto';
import { SearchListingsDto } from './dto/search-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

const publicListing = {
  category: { select: { id: true, name: true, slug: true } },
  seller: { select: { id: true, name: true, createdAt: true } },
};

@Injectable()
export class ClassifiedsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchListingsDto) {
    if (query.minPricePaise !== undefined && query.maxPricePaise !== undefined && query.minPricePaise > query.maxPricePaise) {
      throw new BadRequestException('Minimum price must not exceed maximum price');
    }
    const category = query.category ? await this.prisma.category.findFirst({ where: { slug: query.category, isActive: true }, select: { id: true } }) : null;
    if (query.category && !category) return [];
    return this.prisma.classifiedListing.findMany({
      where: {
        status: ClassifiedListingStatus.ACTIVE,
        expiresAt: { gt: new Date() },
        ...(category ? { categoryId: category.id } : {}),
        ...(query.locality ? { locality: { contains: query.locality, mode: 'insensitive' as const } } : {}),
        ...(query.condition ? { condition: query.condition } : {}),
        ...(query.q ? { OR: [
          { title: { contains: query.q, mode: 'insensitive' as const } },
          { description: { contains: query.q, mode: 'insensitive' as const } },
        ] } : {}),
        ...(query.minPricePaise !== undefined || query.maxPricePaise !== undefined ? { pricePaise: {
          ...(query.minPricePaise !== undefined ? { gte: query.minPricePaise } : {}),
          ...(query.maxPricePaise !== undefined ? { lte: query.maxPricePaise } : {}),
        } } : {}),
      },
      include: publicListing,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async detail(id: string) {
    const listing = await this.prisma.classifiedListing.findFirst({
      where: { id, status: ClassifiedListingStatus.ACTIVE, expiresAt: { gt: new Date() } },
      include: publicListing,
    });
    if (!listing) throw new NotFoundException('This listing is no longer available');
    return listing;
  }

  async sellerProfile(id: string) {
    const seller = await this.prisma.user.findUnique({ where: { id }, select: { id: true, name: true, createdAt: true } });
    if (!seller) throw new NotFoundException('Seller profile not found');
    const listings = await this.prisma.classifiedListing.findMany({
      where: { sellerId: id, status: ClassifiedListingStatus.ACTIVE, expiresAt: { gt: new Date() } },
      include: { category: { select: { name: true, slug: true } }, seller: { select: { id: true, name: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' }, take: 50,
    });
    return { seller, listingCount: listings.length, listings };
  }

  async mine(userId: string) {
    await this.prisma.classifiedListing.updateMany({ where: { sellerId: userId, status: { in: [ClassifiedListingStatus.ACTIVE, ClassifiedListingStatus.PAUSED] }, expiresAt: { lte: new Date() } }, data: { status: ClassifiedListingStatus.EXPIRED } });
    return this.prisma.classifiedListing.findMany({ where: { sellerId: userId }, include: publicListing, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async create(userId: string, dto: CreateListingDto) {
    const category = await this.prisma.category.findFirst({ where: { id: dto.categoryId, isActive: true } });
    if (!category) throw new NotFoundException('Choose an active listing category');
    return this.prisma.classifiedListing.create({
      data: { ...dto, sellerId: userId, expiresAt: this.expiryDate() },
      include: publicListing,
    });
  }

  async update(userId: string, id: string, dto: UpdateListingDto) {
    if (Object.keys(dto).length === 0) throw new BadRequestException('Provide at least one field to update');
    const listing = await this.ownedListing(userId, id);
    if ([ClassifiedListingStatus.SOLD, ClassifiedListingStatus.REMOVED].includes(listing.status)) {
      throw new ConflictException('Sold or removed listings cannot be edited');
    }
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({ where: { id: dto.categoryId, isActive: true } });
      if (!category) throw new NotFoundException('Choose an active listing category');
    }
    return this.prisma.classifiedListing.update({ where: { id }, data: dto, include: publicListing });
  }

  async setStatus(userId: string, id: string, status: ClassifiedListingStatus) {
    const listing = await this.ownedListing(userId, id);
    const transitions: Record<ClassifiedListingStatus, ClassifiedListingStatus[]> = {
      ACTIVE: [ClassifiedListingStatus.PAUSED, ClassifiedListingStatus.SOLD],
      PAUSED: [ClassifiedListingStatus.ACTIVE, ClassifiedListingStatus.SOLD],
      SOLD: [], EXPIRED: [], REMOVED: [],
    };
    const currentStatus = listing.status as ClassifiedListingStatus;
    if (!transitions[currentStatus].includes(status)) throw new ConflictException(`Cannot change a ${currentStatus.toLowerCase()} listing to ${status.toLowerCase()}; renew expired listings first`);
    if (status === ClassifiedListingStatus.ACTIVE && listing.expiresAt <= new Date()) throw new ConflictException('This listing expired; renew it to publish again');
    return this.prisma.classifiedListing.update({ where: { id }, data: { status }, include: publicListing });
  }

  async remove(userId: string, id: string) {
    const listing = await this.ownedListing(userId, id);
    if (listing.status === ClassifiedListingStatus.REMOVED) return listing;
    return this.prisma.classifiedListing.update({ where: { id }, data: { status: ClassifiedListingStatus.REMOVED }, include: publicListing });
  }

  async renew(userId: string, id: string) {
    const listing = await this.ownedListing(userId, id);
    if ([ClassifiedListingStatus.SOLD, ClassifiedListingStatus.REMOVED].includes(listing.status)) throw new ConflictException('Sold or removed listings cannot be renewed');
    return this.prisma.classifiedListing.update({ where: { id }, data: { status: ClassifiedListingStatus.ACTIVE, expiresAt: this.expiryDate() }, include: publicListing });
  }

  async createEnquiry(buyerId: string, listingId: string, dto: CreateEnquiryDto) {
    const listing = await this.detail(listingId);
    if (listing.sellerId === buyerId) throw new BadRequestException('You cannot enquire about your own listing');
    return this.prisma.classifiedEnquiry.create({ data: { listingId, buyerId, sellerId: listing.sellerId, message: dto.message }, include: {
      listing: { select: { id: true, title: true } }, buyer: { select: { id: true, name: true } },
    } });
  }

  async enquiries(userId: string) {
    return this.prisma.classifiedEnquiry.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      include: { listing: { select: { id: true, title: true } }, buyer: { select: { id: true, name: true } }, seller: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
  }

  async reply(userId: string, id: string, dto: ReplyEnquiryDto) {
    const enquiry = await this.prisma.classifiedEnquiry.findUnique({ where: { id } });
    if (!enquiry) throw new NotFoundException('Enquiry not found');
    if (enquiry.sellerId !== userId) throw new ForbiddenException('Only this listing’s seller can reply');
    return this.prisma.classifiedEnquiry.update({ where: { id }, data: { reply: dto.reply, repliedAt: new Date() } });
  }

  async report(userId: string, listingId: string, dto: CreateReportDto) {
    const listing = await this.detail(listingId);
    if (listing.sellerId === userId) throw new BadRequestException('You cannot report your own listing');
    const prior = await this.prisma.classifiedReport.findUnique({ where: { listingId_reporterId: { listingId, reporterId: userId } } });
    if (prior) throw new ConflictException('You have already reported this listing');
    return this.prisma.classifiedReport.create({ data: { listingId, reporterId: userId, reason: dto.reason }, select: { id: true, status: true, createdAt: true } });
  }

  private async ownedListing(userId: string, id: string) {
    const listing = await this.prisma.classifiedListing.findFirst({ where: { id, sellerId: userId } });
    if (!listing) throw new NotFoundException('Listing not found');
    return listing;
  }

  private expiryDate() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    return expiresAt;
  }
}

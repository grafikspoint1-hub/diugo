import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

class EmergencyContactDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(120) nameGu?: string;
  @IsOptional() @IsString() @MaxLength(120) nameHi?: string;
  @IsString() @MinLength(2) @MaxLength(60) category!: string;
  @IsString() @MinLength(3) @MaxLength(32) phone!: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(100) hours?: string;
  @IsUrl({ protocols: ['https'] }) @MaxLength(500) sourceUrl!: string;
  @IsOptional() @IsBoolean() isVerified?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

class UpdateEmergencyContactDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(120) nameGu?: string;
  @IsOptional() @IsString() @MaxLength(120) nameHi?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(60) category?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(32) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(100) hours?: string;
  @IsOptional() @IsUrl({ protocols: ['https'] }) @MaxLength(500) sourceUrl?: string;
  @IsOptional() @IsBoolean() isVerified?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

@Controller()
export class EmergencyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('emergency-contacts')
  list(@Query('category') category?: string, @Query('q') q?: string) {
    return this.prisma.emergencyContact.findMany({
      where: { isActive: true, isVerified: true, ...(category && category !== 'all' ? { category } : {}), ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' as const } }, { category: { contains: q, mode: 'insensitive' as const } }, { phone: { contains: q } }] } : {}) },
      orderBy: [{ category: 'asc' }, { name: 'asc' }], take: 100,
    });
  }

  @Get('admin/emergency-contacts')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  adminList() { return this.prisma.emergencyContact.findMany({ orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }] }); }

  @Post('admin/emergency-contacts')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async create(@Req() req: any, @Body() dto: EmergencyContactDto) {
    const contact = await this.prisma.emergencyContact.create({ data: { ...dto, verifiedAt: dto.isVerified ? new Date() : new Date(0), isVerified: dto.isVerified ?? false } });
    await this.prisma.auditLog.create({ data: { actorId: req.user.id, action: 'EMERGENCY_CONTACT_CREATED', entityType: 'EmergencyContact', entityId: contact.id } });
    return contact;
  }

  @Patch('admin/emergency-contacts/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateEmergencyContactDto) {
    if (!Object.keys(dto).length) throw new BadRequestException('At least one field is required');
    const before = await this.prisma.emergencyContact.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Emergency contact not found');
    const { isVerified, ...data } = dto;
    const contact = await this.prisma.emergencyContact.update({ where: { id }, data: { ...data, ...(isVerified === undefined ? {} : { isVerified, verifiedAt: isVerified ? new Date() : before.verifiedAt }) } });
    await this.prisma.auditLog.create({ data: { actorId: req.user.id, action: 'EMERGENCY_CONTACT_UPDATED', entityType: 'EmergencyContact', entityId: id } });
    return contact;
  }
}

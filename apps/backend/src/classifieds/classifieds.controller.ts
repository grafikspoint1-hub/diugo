import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ClassifiedListingStatus } from '@prisma/client';
import { IsIn } from 'class-validator';
import { ClassifiedsService } from './classifieds.service';
import { CreateEnquiryDto } from './dto/create-enquiry.dto';
import { CreateListingDto } from './dto/create-listing.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { ReplyEnquiryDto } from './dto/reply-enquiry.dto';
import { SearchListingsDto } from './dto/search-listings.dto';
import { UpdateListingDto } from './dto/update-listing.dto';

class ListingStatusDto {
  @IsIn([ClassifiedListingStatus.ACTIVE, ClassifiedListingStatus.PAUSED, ClassifiedListingStatus.SOLD]) status!: ClassifiedListingStatus;
}

@Controller('classifieds')
export class ClassifiedsController {
  constructor(private readonly classifieds: ClassifiedsService) {}

  @Get() search(@Query() query: SearchListingsDto) { return this.classifieds.search(query); }
  @Get('mine') @UseGuards(AuthGuard('jwt')) mine(@Req() req: any) { return this.classifieds.mine(req.user.id); }
  @Get('enquiries/mine') @UseGuards(AuthGuard('jwt')) enquiries(@Req() req: any) { return this.classifieds.enquiries(req.user.id); }
  @Get('sellers/:id') sellerProfile(@Param('id') id: string) { return this.classifieds.sellerProfile(id); }
  @Get(':id') detail(@Param('id') id: string) { return this.classifieds.detail(id); }

  @Post() @UseGuards(AuthGuard('jwt')) create(@Req() req: any, @Body() dto: CreateListingDto) { return this.classifieds.create(req.user.id, dto); }
  @Patch(':id') @UseGuards(AuthGuard('jwt')) update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateListingDto) { return this.classifieds.update(req.user.id, id, dto); }
  @Patch(':id/status') @UseGuards(AuthGuard('jwt')) status(@Req() req: any, @Param('id') id: string, @Body() dto: ListingStatusDto) { return this.classifieds.setStatus(req.user.id, id, dto.status); }
  @Post(':id/renew') @UseGuards(AuthGuard('jwt')) renew(@Req() req: any, @Param('id') id: string) { return this.classifieds.renew(req.user.id, id); }
  @Delete(':id') @UseGuards(AuthGuard('jwt')) remove(@Req() req: any, @Param('id') id: string) { return this.classifieds.remove(req.user.id, id); }
  @Post(':id/enquiries') @UseGuards(AuthGuard('jwt')) enquire(@Req() req: any, @Param('id') id: string, @Body() dto: CreateEnquiryDto) { return this.classifieds.createEnquiry(req.user.id, id, dto); }
  @Post(':id/reports') @UseGuards(AuthGuard('jwt')) report(@Req() req: any, @Param('id') id: string, @Body() dto: CreateReportDto) { return this.classifieds.report(req.user.id, id, dto); }
  @Patch('enquiries/:id/reply') @UseGuards(AuthGuard('jwt')) reply(@Req() req: any, @Param('id') id: string, @Body() dto: ReplyEnquiryDto) { return this.classifieds.reply(req.user.id, id, dto); }
}

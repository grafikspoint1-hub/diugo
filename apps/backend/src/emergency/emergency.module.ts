import { Module } from '@nestjs/common';
import { EmergencyController } from './emergency.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({ imports: [PrismaModule], controllers: [EmergencyController] })
export class EmergencyModule {}

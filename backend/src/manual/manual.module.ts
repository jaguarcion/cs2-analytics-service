
import { Module } from '@nestjs/common';
import { ManualController } from './manual.controller';
import { ManualService } from './manual.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ManualController],
  providers: [ManualService],
  exports: [ManualService],
})
export class ManualModule {}

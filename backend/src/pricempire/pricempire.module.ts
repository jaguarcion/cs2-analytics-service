
import { Module } from '@nestjs/common';
import { PricempireController } from './pricempire.controller';
import { PricempireService } from './pricempire.service';

@Module({
  controllers: [PricempireController],
  providers: [PricempireService],
})
export class PricempireModule {}

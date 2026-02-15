import { Module } from '@nestjs/common';
import { MarketCsgoService } from './market-csgo.service';
import { MarketCsgoController } from './market-csgo.controller';

@Module({
  providers: [MarketCsgoService],
  controllers: [MarketCsgoController],
  exports: [MarketCsgoService],
})
export class MarketCsgoModule {}

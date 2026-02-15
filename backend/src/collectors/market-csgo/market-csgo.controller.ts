import { Controller, Get, Post } from '@nestjs/common';
import { MarketCsgoService } from './market-csgo.service';

@Controller('market-csgo')
export class MarketCsgoController {
  constructor(private readonly marketCsgoService: MarketCsgoService) {}

  @Get('trades')
  async getTrades() {
    return this.marketCsgoService.fetchActiveTrades();
  }

  @Get('rate')
  async getRate() {
    return this.marketCsgoService.fetchWithdrawRate();
  }

  @Post('sync/trades')
  async syncTrades() {
    const count = await this.marketCsgoService.syncTrades();
    return { message: `Synced ${count} trades` };
  }

  @Post('sync/rate')
  async syncRate() {
    const rate = await this.marketCsgoService.syncWithdrawRate();
    return { message: `Synced rate: ${rate}` };
  }
}

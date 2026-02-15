import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { MarketCsgoService } from './market-csgo.service';
import { AuthGuard } from '../../auth/auth.guard';

@Controller('market-csgo')
@UseGuards(AuthGuard)
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
    // Also trigger float update for missing items
    const updatedFloats = await this.marketCsgoService.updateMissingFloats();
    return { message: `Synced ${count} trades, updated ${updatedFloats} floats` };
  }

  @Post('sync/rate')
  async syncRate() {
    const rate = await this.marketCsgoService.syncWithdrawRate();
    return { message: `Synced rate: ${rate}` };
  }
}

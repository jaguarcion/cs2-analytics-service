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
    try {
      const count = await this.marketCsgoService.syncTrades();
      
      // Also trigger float update for missing items (fire and forget or wait?)
      // We wait to report status, but catch errors to not fail the whole request
      let updatedFloats = 0;
      try {
        updatedFloats = await this.marketCsgoService.updateMissingFloats();
      } catch (err) {
        console.error('Error updating floats:', err);
        // Don't fail the request if just float update fails
      }

      return { message: `Synced ${count} trades, updated ${updatedFloats} floats` };
    } catch (error) {
      console.error('Sync failed:', error);
      return { 
        message: 'Sync failed', 
        error: error.message,
        stack: error.stack 
      };
    }
  }

  @Post('sync/rate')
  async syncRate() {
    const rate = await this.marketCsgoService.syncWithdrawRate();
    return { message: `Synced rate: ${rate}` };
  }
}

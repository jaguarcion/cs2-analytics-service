import { Controller, Get, Post } from '@nestjs/common';
import { CsfloatService } from './csfloat.service';

@Controller('csfloat')
export class CsfloatController {
  constructor(private readonly csfloatService: CsfloatService) {}

  @Get('stall')
  async getStall() {
    return this.csfloatService.fetchStall();
  }

  @Get('trades')
  async getTrades() {
    return this.csfloatService.fetchTrades();
  }

  @Post('sync/stall')
  async syncStall() {
    const count = await this.csfloatService.syncStall();
    return { message: `Synced ${count} stall items` };
  }

  @Post('sync/trades')
  async syncTrades() {
    const count = await this.csfloatService.syncTrades();
    return { message: `Synced ${count} trades` };
  }
}

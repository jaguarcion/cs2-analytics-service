
import { Controller, Post, Body, Get, Put, Delete, Param } from '@nestjs/common';
import { ManualService, CreateManualItemDto, CreateManualSaleDto } from './manual.service';

@Controller('manual')
export class ManualController {
  constructor(private readonly manualService: ManualService) {}

  @Post('items')
  async createItem(@Body() dto: CreateManualItemDto) {
    return this.manualService.createItem(dto);
  }

  @Post('sales')
  async createSale(@Body() dto: CreateManualSaleDto) {
    return this.manualService.createSale(dto);
  }

  @Put('trades/:id')
  async updateTrade(@Param('id') id: string, @Body() dto: { price?: number; date?: string; customSource?: string }) {
    return this.manualService.updateTrade(id, dto);
  }

  @Delete('trades/:id')
  async deleteTrade(@Param('id') id: string) {
    return this.manualService.deleteTrade(id);
  }

  @Delete('items/:id')
  async deleteItem(@Param('id') id: string) {
    return this.manualService.deleteItem(id);
  }
}

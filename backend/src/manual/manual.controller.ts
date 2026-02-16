
import { Controller, Post, Body, Get } from '@nestjs/common';
import { ManualService, CreateManualItemDto, CreateManualSaleDto } from './manual.service';

@Controller('api/manual')
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
}

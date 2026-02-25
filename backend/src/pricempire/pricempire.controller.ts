
import { Controller, Get } from '@nestjs/common';
import { PricempireService } from './pricempire.service';

@Controller('pricempire')
export class PricempireController {
  constructor(private readonly service: PricempireService) {}

  @Get('comparison')
  async getComparison() {
    return this.service.getComparison();
  }
}

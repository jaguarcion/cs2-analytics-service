import { Module } from '@nestjs/common';
import { HttpModule } from './http.module';
import { CsfloatService } from './csfloat.service';
import { CsfloatController } from './csfloat.controller';

@Module({
  imports: [HttpModule],
  providers: [CsfloatService],
  controllers: [CsfloatController],
  exports: [CsfloatService],
})
export class CsfloatModule {}

import { Module } from '@nestjs/common';
import { NormalizerModule } from '../normalizer/normalizer.module';
import { MatcherService } from './matcher.service';

@Module({
  imports: [NormalizerModule],
  providers: [MatcherService],
  exports: [MatcherService],
})
export class MatcherModule {}

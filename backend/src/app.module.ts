import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { CsfloatModule } from './collectors/csfloat/csfloat.module';
import { MarketCsgoModule } from './collectors/market-csgo/market-csgo.module';
import { NormalizerModule } from './normalizer/normalizer.module';
import { MatcherModule } from './matcher/matcher.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    CsfloatModule,
    MarketCsgoModule,
    NormalizerModule,
    MatcherModule,
    AnalyticsModule,
    SyncModule,
  ],
})
export class AppModule {}

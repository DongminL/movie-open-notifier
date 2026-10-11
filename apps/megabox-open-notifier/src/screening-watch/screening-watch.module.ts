import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { MegaboxModule } from '../megabox/megabox.module';
import { WATCH_BRANCHES } from '../megabox/branches';
import { TelegramModule } from '@app/telegram';
import { ScreeningWatchService } from './screening-watch.service';
import { DolbyWatchStrategy } from './strategies/dolby-watch.strategy';
import { GvWatchStrategy } from './strategies/gv-watch.strategy';
import { StageGreetingWatchStrategy } from './strategies/stage-greeting-watch.strategy';
import { WATCH_STRATEGIES, WatchStrategy } from './strategies/watch-strategy';

@Module({
  imports: [ScheduleModule.forRoot(), MegaboxModule, TelegramModule],
  providers: [
    {
      provide: WATCH_STRATEGIES,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): WatchStrategy[] =>
        WATCH_BRANCHES.flatMap((branch) => [
          new DolbyWatchStrategy(configService, branch),
          new StageGreetingWatchStrategy(configService, branch),
          new GvWatchStrategy(configService, branch),
        ]),
    },
    ScreeningWatchService,
  ],
})
export class ScreeningWatchModule {}

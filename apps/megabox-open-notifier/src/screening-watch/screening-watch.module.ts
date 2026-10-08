import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MegaboxModule } from '../megabox/megabox.module';
import { TelegramModule } from '@app/telegram';
import { ScreeningWatchService } from './screening-watch.service';
import { DolbyWatchStrategy } from './strategies/dolby-watch.strategy';
import { GvWatchStrategy } from './strategies/gv-watch.strategy';
import { StageGreetingWatchStrategy } from './strategies/stage-greeting-watch.strategy';
import { WATCH_STRATEGIES, WatchStrategy } from './strategies/watch-strategy';

@Module({
  imports: [ScheduleModule.forRoot(), MegaboxModule, TelegramModule],
  providers: [
    DolbyWatchStrategy,
    StageGreetingWatchStrategy,
    GvWatchStrategy,
    {
      provide: WATCH_STRATEGIES,
      inject: [DolbyWatchStrategy, StageGreetingWatchStrategy, GvWatchStrategy],
      useFactory: (
        dolby: DolbyWatchStrategy,
        stageGreeting: StageGreetingWatchStrategy,
        gv: GvWatchStrategy,
      ) => [dolby, stageGreeting, gv] satisfies WatchStrategy[],
    },
    ScreeningWatchService,
  ],
})
export class ScreeningWatchModule {}

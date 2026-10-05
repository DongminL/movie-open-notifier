import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CgvModule } from '../cgv/cgv.module';
import { TelegramModule } from '@app/telegram';
import { ScreeningWatchService } from './screening-watch.service';
import { FourDxWatchStrategy } from './strategies/four-dx-watch.strategy';
import { ImaxWatchStrategy } from './strategies/imax-watch.strategy';
import { ScreenXWatchStrategy } from './strategies/screen-x-watch.strategy';
import { WATCH_STRATEGIES, WatchStrategy } from './strategies/watch-strategy';

@Module({
  imports: [ScheduleModule.forRoot(), CgvModule, TelegramModule],
  providers: [
    ImaxWatchStrategy,
    FourDxWatchStrategy,
    ScreenXWatchStrategy,
    {
      provide: WATCH_STRATEGIES,
      inject: [ImaxWatchStrategy, FourDxWatchStrategy, ScreenXWatchStrategy],
      useFactory: (
        imax: ImaxWatchStrategy,
        fourDx: FourDxWatchStrategy,
        screenX: ScreenXWatchStrategy,
      ) => [imax, fourDx, screenX] satisfies WatchStrategy[],
    },
    ScreeningWatchService,
  ],
})
export class ScreeningWatchModule {}

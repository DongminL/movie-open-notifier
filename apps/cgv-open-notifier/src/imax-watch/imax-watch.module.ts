import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CgvModule } from '../cgv/cgv.module';
import { TelegramModule } from '@app/telegram';
import { ImaxWatchService } from './imax-watch.service';

@Module({
  imports: [ScheduleModule.forRoot(), CgvModule, TelegramModule],
  providers: [ImaxWatchService],
})
export class ImaxWatchModule {}

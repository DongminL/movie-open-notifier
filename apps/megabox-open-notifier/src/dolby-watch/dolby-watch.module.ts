import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MegaboxModule } from '../megabox/megabox.module';
import { TelegramModule } from '@app/telegram';
import { DolbyWatchService } from './dolby-watch.service';

@Module({
  imports: [ScheduleModule.forRoot(), MegaboxModule, TelegramModule],
  providers: [DolbyWatchService],
})
export class DolbyWatchModule {}

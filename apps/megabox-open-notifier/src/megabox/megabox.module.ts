import { Module } from '@nestjs/common';
import { MegaboxScheduleFetcherService } from './megabox-schedule-fetcher.service';

@Module({
  providers: [MegaboxScheduleFetcherService],
  exports: [MegaboxScheduleFetcherService],
})
export class MegaboxModule {}

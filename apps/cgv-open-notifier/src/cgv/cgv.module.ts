import { Module } from '@nestjs/common';
import { CgvScheduleFetcherService } from './cgv-schedule-fetcher.service';
import { PuppeteerBrowserService } from './puppeteer-browser.service';

@Module({
  providers: [CgvScheduleFetcherService, PuppeteerBrowserService],
  exports: [CgvScheduleFetcherService],
})
export class CgvModule {}

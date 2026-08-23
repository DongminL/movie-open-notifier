import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { Browser } from 'puppeteer';
import PuppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { CLOUD_SANDBOX_ARGS } from './utils/puppeteer-args';

// 기본 headless Chrome은 navigator.webdriver=true, UA에 "HeadlessChrome"이 노출되어
// CGV 봇 탐지에 곧바로 걸린다 — stealth 플러그인으로 이런 자동화 신호를 패치한다.
PuppeteerExtra.use(StealthPlugin());

/*
 * 브라우저 프로세스를 앱 생명주기 동안 하나만 띄워 재사용한다 (호출마다 Chromium을
 * 새로 띄우는 비용 제거). 페이지(Page)는 호출자가 각자 만들고 닫아 상태를 격리한다.
 */
@Injectable()
export class PuppeteerBrowserService implements OnApplicationShutdown {
  private readonly logger = new Logger(PuppeteerBrowserService.name);
  private browser: Browser | null = null;

  async getBrowser(): Promise<Browser> {
    if (this.browser?.connected) {
      return this.browser;
    }

    this.browser = await PuppeteerExtra.launch({
      headless: true,
      args: ['--disable-geolocation', ...CLOUD_SANDBOX_ARGS],
    });
    this.browser.once('disconnected', () => {
      this.logger.warn(
        '브라우저 연결이 끊어졌습니다 — 다음 요청 시 재시작됩니다.',
      );
    });

    return this.browser;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.browser?.close().catch(() => {});
  }
}

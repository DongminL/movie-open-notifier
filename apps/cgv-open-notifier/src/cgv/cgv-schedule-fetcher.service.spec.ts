import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CgvScheduleFetcherService } from './cgv-schedule-fetcher.service';
import { PuppeteerBrowserService } from './puppeteer-browser.service';
import { Screening } from './dto/screening.dto';

// puppeteer-extra 로딩(stealth 플러그인 등록)을 피한다
jest.mock('./puppeteer-browser.service', () => ({
  PuppeteerBrowserService: class {},
}));

interface FetcherInternals {
  session: {
    apiUrl: string;
    headers: Record<string, string>;
    capturedAt: number;
  } | null;
  parseScreenings(body: unknown, scnYmd: string): Screening[];
  fetchViaBrowserCrawl(scnYmd: string): Promise<Screening[]>;
}

describe('CgvScheduleFetcherService', () => {
  const fetchMock = jest.fn<Promise<unknown>, [string, unknown]>();
  let service: CgvScheduleFetcherService;
  let internals: FetcherInternals;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    service = new CgvScheduleFetcherService(
      {
        getOrThrow: () => 'https://example.com/imax',
      } as unknown as ConfigService,
      {} as PuppeteerBrowserService,
    );
    internals = service as unknown as FetcherInternals;
  });

  afterEach(() => {
    warn.mockRestore();
  });

  describe('response validation', () => {
    it('maps items of a well-formed response', () => {
      const result = internals.parseScreenings(
        { data: [{ scnsNo: '018', scnSseq: '1' }] },
        '20260825',
      );

      expect(result).toHaveLength(1);
      expect(result[0].scnYmd).toBe('20260825');
    });

    it('treats a response without data as empty', () => {
      expect(internals.parseScreenings({}, '20260825')).toEqual([]);
    });

    it.each([
      ['a null body', null],
      ['a non-object body', 'oops'],
      ['data that is not an array', { data: 'oops' }],
      ['an item that is not an object', { data: [null] }],
    ])('throws for %s', (_, body) => {
      expect(() => internals.parseScreenings(body, '20260825')).toThrow(/형식/);
    });
  });

  describe('session fallback', () => {
    beforeEach(() => {
      internals.session = {
        apiUrl: 'https://example.com/api?scnYmd=20260824',
        headers: {},
        capturedAt: Date.now(),
      };
    });

    it('logs why the direct request failed before falling back to the browser', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 403 });
      const crawl = jest
        .spyOn(internals, 'fetchViaBrowserCrawl')
        .mockResolvedValue([]);

      await expect(service.fetchScreenings('20260825')).resolves.toEqual([]);

      expect(crawl).toHaveBeenCalledWith('20260825');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('403'));
    });

    it('logs the error message when the direct request throws', async () => {
      fetchMock.mockRejectedValue(new Error('socket hang up'));
      jest.spyOn(internals, 'fetchViaBrowserCrawl').mockResolvedValue([]);

      await service.fetchScreenings('20260825');

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('socket hang up'),
      );
    });
  });
});

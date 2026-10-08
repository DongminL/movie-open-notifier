import { ConfigService } from '@nestjs/config';
import { MegaboxScheduleFetcherService } from './megabox-schedule-fetcher.service';

describe('MegaboxScheduleFetcherService', () => {
  const fetchMock = jest.fn<Promise<unknown>, [string, { body: string }]>();
  const service = new MegaboxScheduleFetcherService({
    getOrThrow: () => 'https://example.com/schedulePage.do',
  } as unknown as ConfigService);

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue(undefined);
  });

  const mockResponse = (movieFormList: unknown[]): void => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ statCd: 0, megaMap: { movieFormList } }),
    });
  };

  it('requests with only masterType, firstAt, playDe and brchNo1', async () => {
    mockResponse([]);

    await service.fetchScreenings('20260826');

    const init = fetchMock.mock.calls[0][1];
    expect(JSON.parse(init.body) as unknown).toEqual({
      masterType: 'brch',
      firstAt: 'N',
      playDe: '20260826',
      brchNo1: '0019',
    });
  });

  it('maps theabKindCd and eventDivCd, defaulting null to empty string', async () => {
    mockResponse([
      { playSchdlNo: '1', theabKindCd: 'DBC', eventDivCd: 'MEK01' },
      { playSchdlNo: '2', theabKindCd: 'NOR', eventDivCd: null },
    ]);

    const result = await service.fetchScreenings('20260826');

    expect(result.map((s) => [s.theabKindCd, s.eventDivCd])).toEqual([
      ['DBC', 'MEK01'],
      ['NOR', ''],
    ]);
  });
});

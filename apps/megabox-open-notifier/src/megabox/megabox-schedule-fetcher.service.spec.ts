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

  it('requests all watched branches in a single call via brchNo1..N', async () => {
    mockResponse([]);

    await service.fetchScreenings('20260826');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const init = fetchMock.mock.calls[0][1];
    expect(JSON.parse(init.body) as unknown).toEqual({
      masterType: 'brch',
      firstAt: 'N',
      playDe: '20260826',
      brchNo1: '0019',
      brchNo2: '1351',
      brchNo3: '1212',
    });
  });

  it('maps theabKindCd and eventDivCd, defaulting null to empty string', async () => {
    mockResponse([
      {
        playSchdlNo: '1',
        brchNo: '0019',
        theabKindCd: 'DBC',
        eventDivCd: 'MEK01',
      },
      {
        playSchdlNo: '2',
        brchNo: '0019',
        theabKindCd: 'NOR',
        eventDivCd: null,
      },
    ]);

    const result = await service.fetchScreenings('20260826');

    expect(result.map((s) => [s.theabKindCd, s.eventDivCd])).toEqual([
      ['DBC', 'MEK01'],
      ['NOR', ''],
    ]);
  });

  it('throws when items come back but none carries brchNo', async () => {
    mockResponse([{ playSchdlNo: '1' }, { playSchdlNo: '2' }]);

    await expect(service.fetchScreenings('20260826')).rejects.toThrow(/brchNo/);
  });

  it('returns an empty list without error when there are no items', async () => {
    mockResponse([]);

    await expect(service.fetchScreenings('20260826')).resolves.toEqual([]);
  });

  it('maps brchNo so callers can tell branches apart', async () => {
    mockResponse([{ playSchdlNo: '1', brchNo: '1351' }, { playSchdlNo: '2' }]);

    const result = await service.fetchScreenings('20260826');

    expect(result.map((s) => s.brchNo)).toEqual(['1351', '']);
  });
});

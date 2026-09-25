import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { mkdir, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { TelegramService } from '@app/telegram';
import { CgvScheduleFetcherService } from '../cgv/cgv-schedule-fetcher.service';
import { Screening } from '../cgv/dto/screening.dto';
import { ScreeningWatchService } from './screening-watch.service';
import { FourDxWatchStrategy } from './strategies/four-dx-watch.strategy';
import { ImaxWatchStrategy } from './strategies/imax-watch.strategy';
import { WatchStrategy } from './strategies/watch-strategy';

jest.mock('@app/common', () => ({
  ...jest.requireActual<object>('@app/common'),
  sleep: jest.fn().mockResolvedValue(undefined),
}));

const buildScreening = (overrides: Partial<Screening>): Screening => ({
  scnYmd: '20260825',
  scnsNo: '018',
  scnSseq: '1',
  movNm: '영화 제목',
  scnsrtTm: '1000',
  scnendTm: '1220',
  seatInfo: '100/120',
  tcscnsGradCd: '01',
  scnsEnm: '2D',
  ...overrides,
});

const imaxScreening = buildScreening({
  scnSseq: '1',
  tcscnsGradCd: '03',
  scnsEnm: 'IMAX',
});
const fourDxScreening = buildScreening({ scnSseq: '2', tcscnsGradCd: '02' });

describe('ScreeningWatchService', () => {
  let dir: string;
  let fetchScreenings: jest.Mock<Promise<Screening[]>, [string]>;
  let sendMessage: jest.Mock<Promise<void>, [string, string?]>;
  let service: ScreeningWatchService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'screening-watch-'));
    fetchScreenings = jest.fn<Promise<Screening[]>, [string]>();
    sendMessage = jest
      .fn<Promise<void>, [string, string?]>()
      .mockResolvedValue(undefined);

    const strategyValues: Record<string, string> = {
      TELEGRAM_CHAT_ID_IMAX: 'imax-chat',
      TELEGRAM_CHAT_ID_4DX: '4dx-chat',
      IMAX_SNAPSHOT_PATH: join(dir, 'imax.json'),
      FOURDX_SNAPSHOT_PATH: join(dir, '4dx.json'),
    };
    const strategyConfig = {
      getOrThrow: (key: string) => strategyValues[key],
    } as unknown as ConfigService;
    const strategies: WatchStrategy[] = [
      new ImaxWatchStrategy(strategyConfig),
      new FourDxWatchStrategy(strategyConfig),
    ];
    const config = {
      // buildDateRange가 3일 후부터 시작하므로 4이면 조회 날짜가 정확히 1개
      getOrThrow: (key: string) => (key === 'WATCH_HORIZON_DAYS' ? 4 : 22),
    } as unknown as ConfigService;

    service = new ScreeningWatchService(
      config,
      {} as SchedulerRegistry,
      { fetchScreenings } as unknown as CgvScheduleFetcherService,
      { sendMessage } as unknown as TelegramService,
      strategies,
    );
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const runCycle = (): Promise<void> =>
    (service as unknown as { runCycle(): Promise<void> }).runCycle();

  it('fetches once per date and starts each strategy in its own chat', async () => {
    fetchScreenings.mockResolvedValue([imaxScreening, fourDxScreening]);

    await runCycle();

    expect(fetchScreenings).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('IMAX 감시를 시작'),
      'imax-chat',
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('4DX 감시를 시작'),
      '4dx-chat',
    );
  });

  it('notifies only the 4DX chat when a new 4DX screening opens', async () => {
    fetchScreenings.mockResolvedValue([imaxScreening, fourDxScreening]);
    await runCycle();
    sendMessage.mockClear();

    const newFourDx = buildScreening({
      scnSseq: '3',
      tcscnsGradCd: '02',
    });
    fetchScreenings.mockResolvedValue([
      imaxScreening,
      fourDxScreening,
      newFourDx,
    ]);
    await runCycle();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('4DX 오픈'),
      '4dx-chat',
    );
  });

  it('keeps the other strategies running when one fails to save its snapshot', async () => {
    await mkdir(join(dir, 'imax.json')); // 파일이 아닌 디렉터리라 IMAX 스냅샷 저장이 실패한다
    fetchScreenings.mockResolvedValue([imaxScreening, fourDxScreening]);

    await expect(runCycle()).resolves.toBeUndefined();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('4DX 감시를 시작'),
      '4dx-chat',
    );
  });

  it('does not notify anyone when nothing changed after the cold start', async () => {
    fetchScreenings.mockResolvedValue([imaxScreening, fourDxScreening]);
    await runCycle();
    sendMessage.mockClear();

    await runCycle();

    expect(sendMessage).not.toHaveBeenCalled();
  });
});

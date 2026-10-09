import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { mkdir, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { TelegramService } from '@app/telegram';
import { Screening } from '../megabox/dto/screening.dto';
import { MegaboxScheduleFetcherService } from '../megabox/megabox-schedule-fetcher.service';
import { ScreeningWatchService } from './screening-watch.service';
import { DolbyWatchStrategy } from './strategies/dolby-watch.strategy';
import { GvWatchStrategy } from './strategies/gv-watch.strategy';
import { StageGreetingWatchStrategy } from './strategies/stage-greeting-watch.strategy';
import { WatchStrategy } from './strategies/watch-strategy';

jest.mock('@app/common', () => ({
  ...jest.requireActual<object>('@app/common'),
  sleep: jest.fn().mockResolvedValue(undefined),
}));

const buildScreening = (overrides: Partial<Screening>): Screening => ({
  playSchdlNo: '1',
  movieNm: '영화 제목',
  screenType: '2D',
  playStartTime: '10:00',
  playEndTime: '12:20',
  seatInfo: '100/290',
  playDe: '20260826',
  theabKindCd: 'NOR',
  eventDivCd: '',
  ...overrides,
});

const dolbyScreening = buildScreening({ playSchdlNo: '1', theabKindCd: 'DBC' });
const stageScreening = buildScreening({
  playSchdlNo: '2',
  eventDivCd: 'MEK01',
});
const gvScreening = buildScreening({ playSchdlNo: '3', eventDivCd: 'MEK06' });
const allScreenings = [dolbyScreening, stageScreening, gvScreening];

describe('ScreeningWatchService', () => {
  let dir: string;
  let fetchScreenings: jest.Mock<Promise<Screening[]>, [string]>;
  let sendMessage: jest.Mock<Promise<void>, [string, string?]>;
  let service: ScreeningWatchService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'megabox-watch-'));
    fetchScreenings = jest.fn<Promise<Screening[]>, [string]>();
    sendMessage = jest
      .fn<Promise<void>, [string, string?]>()
      .mockResolvedValue(undefined);

    const strategyValues: Record<string, string> = {
      TELEGRAM_CHAT_ID_DOLBY: 'dolby-chat',
      TELEGRAM_CHAT_ID_STAGE_GREETING: 'stage-chat',
      TELEGRAM_CHAT_ID_GV: 'gv-chat',
      DOLBY_SNAPSHOT_PATH: join(dir, 'dolby.json'),
      STAGE_GREETING_SNAPSHOT_PATH: join(dir, 'stage.json'),
      GV_SNAPSHOT_PATH: join(dir, 'gv.json'),
    };
    const strategyConfig = {
      getOrThrow: (key: string) => strategyValues[key],
    } as unknown as ConfigService;
    const strategies: WatchStrategy[] = [
      new DolbyWatchStrategy(strategyConfig),
      new StageGreetingWatchStrategy(strategyConfig),
      new GvWatchStrategy(strategyConfig),
    ];
    const config = {
      // buildDateRange가 3일 후부터 시작하므로 4이면 조회 날짜가 정확히 1개
      getOrThrow: (key: string) => (key === 'WATCH_HORIZON_DAYS' ? 4 : 22),
    } as unknown as ConfigService;

    service = new ScreeningWatchService(
      config,
      {} as SchedulerRegistry,
      { fetchScreenings } as unknown as MegaboxScheduleFetcherService,
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
    fetchScreenings.mockResolvedValue(allScreenings);

    await runCycle();

    expect(fetchScreenings).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledTimes(3);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('DOLBY CINEMA 감시를 시작'),
      'dolby-chat',
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('무대인사 감시를 시작'),
      'stage-chat',
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('GV 감시를 시작'),
      'gv-chat',
    );
  });

  it('notifies only the stage greeting chat when a new stage greeting opens', async () => {
    fetchScreenings.mockResolvedValue(allScreenings);
    await runCycle();
    sendMessage.mockClear();

    const added = buildScreening({ playSchdlNo: '4', eventDivCd: 'MEK01' });
    fetchScreenings.mockResolvedValue([...allScreenings, added]);
    await runCycle();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringMatching(
        /무대인사 오픈[\s\S]*\(https:\/\/www\.megabox\.co\.kr\/theater\/time\?/,
      ),
      'stage-chat',
    );
  });

  it('notifies only the GV chat when a new GV opens', async () => {
    fetchScreenings.mockResolvedValue(allScreenings);
    await runCycle();
    sendMessage.mockClear();

    const added = buildScreening({ playSchdlNo: '5', eventDivCd: 'MEK06' });
    fetchScreenings.mockResolvedValue([...allScreenings, added]);
    await runCycle();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringMatching(
        /GV 오픈[\s\S]*\(https:\/\/www\.megabox\.co\.kr\/theater\/time\?/,
      ),
      'gv-chat',
    );
  });

  it('keeps the other strategies running when one fails to save its snapshot', async () => {
    await mkdir(join(dir, 'dolby.json')); // 파일이 아닌 디렉터리라 돌비 스냅샷 저장이 실패한다
    fetchScreenings.mockResolvedValue(allScreenings);

    await expect(runCycle()).resolves.toBeUndefined();

    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('무대인사 감시를 시작'),
      'stage-chat',
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('GV 감시를 시작'),
      'gv-chat',
    );
  });

  it('does not notify anyone when nothing changed after the cold start', async () => {
    fetchScreenings.mockResolvedValue(allScreenings);
    await runCycle();
    sendMessage.mockClear();

    await runCycle();

    expect(sendMessage).not.toHaveBeenCalled();
  });
});

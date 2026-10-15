import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { mkdir, mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { TelegramService } from '@app/telegram';
import { WATCH_BRANCHES } from '../megabox/branches';
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

const [PRIMARY, COEX] = WATCH_BRANCHES;
const DOLBY_TOPIC = 1351;
const STAGE_TOPIC = 2351;
const GV_TOPIC = 3351;

const buildScreening = (overrides: Partial<Screening>): Screening => ({
  playSchdlNo: '1',
  movieNm: '영화 제목',
  screenType: '2D',
  playStartTime: '10:00',
  playEndTime: '12:20',
  seatInfo: '100/290',
  playDe: '20260826',
  brchNo: PRIMARY.brchNo,
  theabKindCd: 'NOR',
  eventDivCd: '',
  ...overrides,
});

const primaryScreenings = [
  buildScreening({ playSchdlNo: '1', theabKindCd: 'DBC' }),
  buildScreening({ playSchdlNo: '2', eventDivCd: 'MEK01' }),
  buildScreening({ playSchdlNo: '3', eventDivCd: 'MEK06' }),
];
const coexScreenings = [
  buildScreening({
    playSchdlNo: '11',
    brchNo: COEX.brchNo,
    theabKindCd: 'DBC',
  }),
  buildScreening({
    playSchdlNo: '12',
    brchNo: COEX.brchNo,
    eventDivCd: 'MEK01',
  }),
  buildScreening({
    playSchdlNo: '13',
    brchNo: COEX.brchNo,
    eventDivCd: 'MEK06',
  }),
];
const allScreenings = [...primaryScreenings, ...coexScreenings];

// 가짜 시계는 Date만 대체한다 (조회 날짜가 오늘 기준으로 계산되므로)
const useFakeDate = (now: Date): void => {
  jest.useFakeTimers({
    now,
    doNotFake: [
      'hrtime',
      'nextTick',
      'performance',
      'queueMicrotask',
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'requestIdleCallback',
      'cancelIdleCallback',
      'setImmediate',
      'clearImmediate',
      'setInterval',
      'clearInterval',
      'setTimeout',
      'clearTimeout',
    ],
  });
};

describe('ScreeningWatchService', () => {
  let dir: string;
  let fetchScreenings: jest.Mock<Promise<Screening[]>, [string]>;
  let sendMessage: jest.Mock<Promise<boolean>, [string, string?, number?]>;
  let service: ScreeningWatchService;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'megabox-watch-'));
    fetchScreenings = jest.fn<Promise<Screening[]>, [string]>();
    sendMessage = jest
      .fn<Promise<boolean>, [string, string?, number?]>()
      .mockResolvedValue(true);

    const strategyValues: Record<string, string | number> = {
      TELEGRAM_CHAT_ID_DOLBY: 'dolby-chat',
      TELEGRAM_CHAT_ID_STAGE_GREETING: 'stage-chat',
      TELEGRAM_CHAT_ID_GV: 'gv-chat',
      DOLBY_SNAPSHOT_PATH: join(dir, 'dolby.json'),
      STAGE_GREETING_SNAPSHOT_PATH: join(dir, 'stage.json'),
      GV_SNAPSHOT_PATH: join(dir, 'gv.json'),
      [`TELEGRAM_TOPIC_ID_DOLBY_${COEX.brchNo}`]: DOLBY_TOPIC,
      [`TELEGRAM_TOPIC_ID_STAGE_GREETING_${COEX.brchNo}`]: STAGE_TOPIC,
      [`TELEGRAM_TOPIC_ID_GV_${COEX.brchNo}`]: GV_TOPIC,
    };
    const strategyConfig = {
      getOrThrow: (key: string) => strategyValues[key],
      get: (key: string) => strategyValues[key],
    } as unknown as ConfigService;
    const strategies: WatchStrategy[] = [PRIMARY, COEX].flatMap((branch) => [
      new DolbyWatchStrategy(strategyConfig, branch),
      new StageGreetingWatchStrategy(strategyConfig, branch),
      new GvWatchStrategy(strategyConfig, branch),
    ]);
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
    jest.useRealTimers();
    await rm(dir, { recursive: true, force: true });
  });

  const runCycle = (): Promise<void> =>
    (service as unknown as { runCycle(): Promise<void> }).runCycle();

  it('fetches once per date and starts each branch strategy in its own chat and topic', async () => {
    fetchScreenings.mockResolvedValue(allScreenings);

    await runCycle();

    expect(fetchScreenings).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledTimes(6);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining(`${PRIMARY.name} DOLBY CINEMA 감시를 시작`),
      'dolby-chat',
      undefined,
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining(`${COEX.name} DOLBY CINEMA 감시를 시작`),
      'dolby-chat',
      DOLBY_TOPIC,
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining(`${COEX.name} 무대인사 감시를 시작`),
      'stage-chat',
      STAGE_TOPIC,
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining(`${COEX.name} GV 감시를 시작`),
      'gv-chat',
      GV_TOPIC,
    );
  });

  it('notifies only the branch topic when a new Dolby screening opens there', async () => {
    fetchScreenings.mockResolvedValue(allScreenings);
    await runCycle();
    sendMessage.mockClear();

    const added = buildScreening({
      playSchdlNo: '14',
      brchNo: COEX.brchNo,
      theabKindCd: 'DBC',
    });
    fetchScreenings.mockResolvedValue([...allScreenings, added]);
    await runCycle();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(
          `메가박스 ${COEX.name} 상영 시간표[\\s\\S]*DOLBY CINEMA 오픈[\\s\\S]*brchNo=${COEX.brchNo}`,
        ),
      ),
      'dolby-chat',
      DOLBY_TOPIC,
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
      undefined,
    );
  });

  it('notifies only the GV chat of the branch when a new GV opens', async () => {
    fetchScreenings.mockResolvedValue(allScreenings);
    await runCycle();
    sendMessage.mockClear();

    const added = buildScreening({
      playSchdlNo: '15',
      brchNo: COEX.brchNo,
      eventDivCd: 'MEK06',
    });
    fetchScreenings.mockResolvedValue([...allScreenings, added]);
    await runCycle();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringMatching(
        /GV 오픈[\s\S]*\(https:\/\/www\.megabox\.co\.kr\/theater\/time\?/,
      ),
      'gv-chat',
      GV_TOPIC,
    );
  });

  it('keeps the other strategies running when one fails to save its snapshot', async () => {
    await mkdir(join(dir, `dolby-${PRIMARY.brchNo}.json`)); // 파일이 아닌 디렉터리라 기본 지점 돌비 스냅샷 저장이 실패한다
    fetchScreenings.mockResolvedValue(allScreenings);

    await expect(runCycle()).resolves.toBeUndefined();

    expect(sendMessage).toHaveBeenCalledTimes(5);
    expect(sendMessage).not.toHaveBeenCalledWith(
      expect.stringContaining(`${PRIMARY.name} DOLBY CINEMA 감시를 시작`),
      'dolby-chat',
      undefined,
    );
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining(`${COEX.name} DOLBY CINEMA 감시를 시작`),
      'dolby-chat',
      DOLBY_TOPIC,
    );
  });

  it('re-sends a new screening alert next cycle when the send failed', async () => {
    fetchScreenings.mockResolvedValue(allScreenings);
    await runCycle();
    sendMessage.mockClear();

    const added = buildScreening({ playSchdlNo: '16', eventDivCd: 'MEK06' });
    fetchScreenings.mockResolvedValue([...allScreenings, added]);
    sendMessage.mockResolvedValueOnce(false);
    await runCycle();
    sendMessage.mockClear();

    await runCycle();

    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('GV 오픈'),
      'gv-chat',
      undefined,
    );
  });

  it('does not alert again once the retried send succeeded', async () => {
    fetchScreenings.mockResolvedValue(allScreenings);
    await runCycle();

    const added = buildScreening({ playSchdlNo: '16', eventDivCd: 'MEK06' });
    fetchScreenings.mockResolvedValue([...allScreenings, added]);
    sendMessage.mockResolvedValueOnce(false);
    await runCycle();
    await runCycle();
    sendMessage.mockClear();

    await runCycle();

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('repeats the cold start message next cycle when it failed to send', async () => {
    fetchScreenings.mockResolvedValue(allScreenings);
    sendMessage.mockResolvedValue(false);
    await runCycle();
    sendMessage.mockClear();
    sendMessage.mockResolvedValue(true);

    await runCycle();

    expect(sendMessage).toHaveBeenCalledTimes(6);
    expect(sendMessage).toHaveBeenCalledWith(
      expect.stringContaining('감시를 시작'),
      'gv-chat',
      undefined,
    );
  });

  it('drops dates that rolled out of the watch range from the snapshot file', async () => {
    useFakeDate(new Date(2026, 7, 1));
    fetchScreenings.mockResolvedValue(allScreenings);
    const dolbyPath = join(dir, `dolby-${PRIMARY.brchNo}.json`);
    const savedDates = async (): Promise<string[]> =>
      Object.keys(JSON.parse(await readFile(dolbyPath, 'utf-8')) as object);

    await runCycle();
    expect(await savedDates()).toEqual(['20260804']);

    jest.setSystemTime(new Date(2026, 7, 2));
    await runCycle();

    expect(await savedDates()).toEqual(['20260805']);
  });

  it('does not notify anyone when nothing changed after the cold start', async () => {
    fetchScreenings.mockResolvedValue(allScreenings);
    await runCycle();
    sendMessage.mockClear();

    await runCycle();

    expect(sendMessage).not.toHaveBeenCalled();
  });
});

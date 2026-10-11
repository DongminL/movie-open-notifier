import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { Branch, WATCH_BRANCHES } from '../../megabox/branches';
import { Screening } from '../../megabox/dto/screening.dto';
import { StageGreetingWatchStrategy } from './stage-greeting-watch.strategy';

const [PRIMARY, COEX] = WATCH_BRANCHES;

const buildScreening = (overrides: Partial<Screening>): Screening => ({
  playSchdlNo: '2608260019001',
  movieNm: '영화 제목',
  screenType: 'DOLBY CINEMA [Laser]',
  playStartTime: '10:00',
  playEndTime: '12:20',
  seatInfo: '100/290',
  playDe: '20260826',
  brchNo: PRIMARY.brchNo,
  theabKindCd: 'NOR',
  eventDivCd: '',
  ...overrides,
});

describe('StageGreetingWatchStrategy', () => {
  const values: Record<string, string | number> = {
    TELEGRAM_CHAT_ID_STAGE_GREETING: 'stage-greeting-chat',
    STAGE_GREETING_SNAPSHOT_PATH: 'data/stage-greeting-snapshot.json',
    [`TELEGRAM_TOPIC_ID_STAGE_GREETING_${COEX.brchNo}`]: 1351,
  };
  const config = {
    getOrThrow: (key: string) => values[key],
    get: (key: string) => values[key],
  } as unknown as ConfigService;
  const create = (branch: Branch): StageGreetingWatchStrategy =>
    new StageGreetingWatchStrategy(config, branch);

  it('reads its label, chat, theater and snapshot path from config', () => {
    const strategy = create(PRIMARY);

    expect(strategy.label).toBe('무대인사');
    expect(strategy.chatId).toBe('stage-greeting-chat');
    expect(strategy.theaterName).toBe(PRIMARY.name);
    expect(strategy.snapshotPath).toBe(
      resolve(
        process.cwd(),
        `data/stage-greeting-snapshot-${PRIMARY.brchNo}.json`,
      ),
    );
  });

  it('adds the branch code to the snapshot path and uses the branch topic for non-primary branches', () => {
    const strategy = create(COEX);

    expect(strategy.snapshotPath).toBe(
      resolve(
        process.cwd(),
        `data/stage-greeting-snapshot-${COEX.brchNo}.json`,
      ),
    );
    expect(strategy.threadId).toBe(1351);
  });

  it('keeps only MEK01 screenings of its own branch', () => {
    const screenings: Screening[] = [
      buildScreening({ playSchdlNo: '1', eventDivCd: 'MEK01' }),
      buildScreening({ playSchdlNo: '2' }),
      buildScreening({
        playSchdlNo: '3',
        theabKindCd: 'DBC',
        eventDivCd: 'OTHER',
      }),
      buildScreening({
        playSchdlNo: '4',
        eventDivCd: 'MEK01',
        brchNo: COEX.brchNo,
      }),
    ];

    expect(
      create(PRIMARY)
        .filter(screenings)
        .map((s) => s.playSchdlNo),
    ).toEqual(['1']);
    expect(
      create(COEX)
        .filter(screenings)
        .map((s) => s.playSchdlNo),
    ).toEqual(['4']);
  });

  it('links to its own branch timetable page', () => {
    expect(create(COEX).buildBookingUrl('20260826')).toBe(
      `https://www.megabox.co.kr/theater/time?brchNo=${COEX.brchNo}&playDe=20260826`,
    );
  });
});

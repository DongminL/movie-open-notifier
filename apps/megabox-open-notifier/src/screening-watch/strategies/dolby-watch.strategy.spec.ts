import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { Branch, WATCH_BRANCHES } from '../../megabox/branches';
import { Screening } from '../../megabox/dto/screening.dto';
import { DolbyWatchStrategy } from './dolby-watch.strategy';

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

describe('DolbyWatchStrategy', () => {
  const values: Record<string, string | number> = {
    TELEGRAM_CHAT_ID_DOLBY: 'dolby-chat',
    DOLBY_SNAPSHOT_PATH: 'data/dolby-snapshot.json',
    [`TELEGRAM_TOPIC_ID_DOLBY_${COEX.brchNo}`]: 1351,
  };
  const config = {
    getOrThrow: (key: string) => values[key],
    get: (key: string) => values[key],
  } as unknown as ConfigService;
  const create = (branch: Branch): DolbyWatchStrategy =>
    new DolbyWatchStrategy(config, branch);

  it('reads its label, chat, theater and snapshot path from config', () => {
    const strategy = create(PRIMARY);

    expect(strategy.label).toBe('DOLBY CINEMA');
    expect(strategy.chatId).toBe('dolby-chat');
    expect(strategy.theaterName).toBe(PRIMARY.name);
    expect(strategy.snapshotPath).toBe(
      resolve(process.cwd(), `data/dolby-snapshot-${PRIMARY.brchNo}.json`),
    );
  });

  it('adds the branch code to the snapshot path for every branch', () => {
    expect(create(COEX).snapshotPath).toBe(
      resolve(process.cwd(), `data/dolby-snapshot-${COEX.brchNo}.json`),
    );
  });

  it('uses the branch topic id as threadId, undefined when not configured', () => {
    expect(create(COEX).threadId).toBe(1351);
    expect(create(PRIMARY).threadId).toBeUndefined();
  });

  it('keeps only DBC screenings of its own branch', () => {
    const screenings: Screening[] = [
      buildScreening({ playSchdlNo: '1', theabKindCd: 'DBC' }),
      buildScreening({ playSchdlNo: '2' }),
      buildScreening({ playSchdlNo: '3', theabKindCd: 'CFT' }),
      buildScreening({
        playSchdlNo: '4',
        theabKindCd: 'DBC',
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

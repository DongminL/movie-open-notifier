import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { Screening } from '../../megabox/dto/screening.dto';
import { GvWatchStrategy } from './gv-watch.strategy';

const buildScreening = (overrides: Partial<Screening>): Screening => ({
  playSchdlNo: '2608260019001',
  movieNm: '영화 제목',
  screenType: 'DOLBY CINEMA [Laser]',
  playStartTime: '10:00',
  playEndTime: '12:20',
  seatInfo: '100/290',
  playDe: '20260826',
  theabKindCd: 'NOR',
  eventDivCd: '',
  ...overrides,
});

describe('GvWatchStrategy', () => {
  const values: Record<string, string> = {
    TELEGRAM_CHAT_ID_GV: 'gv-chat',
    GV_SNAPSHOT_PATH: 'data/gv-snapshot.json',
  };
  const strategy = new GvWatchStrategy({
    getOrThrow: (key: string) => values[key],
  } as unknown as ConfigService);

  it('reads its label, chat and snapshot path from config', () => {
    expect(strategy.label).toBe('GV');
    expect(strategy.chatId).toBe('gv-chat');
    expect(strategy.snapshotPath).toBe(
      resolve(process.cwd(), 'data/gv-snapshot.json'),
    );
  });

  it('keeps only screenings with eventDivCd MEK06', () => {
    const screenings: Screening[] = [
      buildScreening({ playSchdlNo: '1', eventDivCd: 'MEK06' }),
      buildScreening({ playSchdlNo: '2' }),
      buildScreening({
        playSchdlNo: '3',
        theabKindCd: 'DBC',
        eventDivCd: 'OTHER',
      }),
    ];

    expect(strategy.filter(screenings).map((s) => s.playSchdlNo)).toEqual([
      '1',
    ]);
  });

  it('links to the general branch timetable, not the Dolby page', () => {
    expect(strategy.buildBookingUrl('20260826')).toBe(
      'https://www.megabox.co.kr/theater/time?brchNo=0019&playDe=20260826',
    );
  });
});

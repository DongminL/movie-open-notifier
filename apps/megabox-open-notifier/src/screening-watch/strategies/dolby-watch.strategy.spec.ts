import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { Screening } from '../../megabox/dto/screening.dto';
import { DolbyWatchStrategy } from './dolby-watch.strategy';

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

describe('DolbyWatchStrategy', () => {
  const values: Record<string, string> = {
    TELEGRAM_CHAT_ID_DOLBY: 'dolby-chat',
    DOLBY_SNAPSHOT_PATH: 'data/dolby-snapshot.json',
  };
  const strategy = new DolbyWatchStrategy({
    getOrThrow: (key: string) => values[key],
  } as unknown as ConfigService);

  it('reads its label, chat and snapshot path from config', () => {
    expect(strategy.label).toBe('DOLBY CINEMA');
    expect(strategy.chatId).toBe('dolby-chat');
    expect(strategy.snapshotPath).toBe(
      resolve(process.cwd(), 'data/dolby-snapshot.json'),
    );
  });

  it('keeps only screenings with theabKindCd DBC', () => {
    const screenings: Screening[] = [
      buildScreening({ playSchdlNo: '1', theabKindCd: 'DBC' }),
      buildScreening({ playSchdlNo: '2' }),
      buildScreening({ playSchdlNo: '3', theabKindCd: 'CFT' }),
    ];

    expect(strategy.filter(screenings).map((s) => s.playSchdlNo)).toEqual([
      '1',
    ]);
  });

  it('links to the Dolby timetable page', () => {
    expect(strategy.buildBookingUrl('20260826')).toBe(
      'https://www.megabox.co.kr/theater/time?brchNo=0019&playDe=20260826',
    );
  });
});

import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { Screening } from '../../megabox/dto/screening.dto';
import { StageGreetingWatchStrategy } from './stage-greeting-watch.strategy';

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

describe('StageGreetingWatchStrategy', () => {
  const values: Record<string, string> = {
    TELEGRAM_CHAT_ID_STAGE_GREETING: 'stage-greeting-chat',
    STAGE_GREETING_SNAPSHOT_PATH: 'data/stage-greeting-snapshot.json',
  };
  const strategy = new StageGreetingWatchStrategy({
    getOrThrow: (key: string) => values[key],
  } as unknown as ConfigService);

  it('reads its label, chat and snapshot path from config', () => {
    expect(strategy.label).toBe('무대인사');
    expect(strategy.chatId).toBe('stage-greeting-chat');
    expect(strategy.snapshotPath).toBe(
      resolve(process.cwd(), 'data/stage-greeting-snapshot.json'),
    );
  });

  it('keeps only screenings with eventDivCd MEK01', () => {
    const screenings: Screening[] = [
      buildScreening({ playSchdlNo: '1', eventDivCd: 'MEK01' }),
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

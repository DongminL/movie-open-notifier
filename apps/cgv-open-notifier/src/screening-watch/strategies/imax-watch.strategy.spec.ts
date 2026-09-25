import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { Screening } from '../../cgv/dto/screening.dto';
import { ImaxWatchStrategy } from './imax-watch.strategy';

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

describe('ImaxWatchStrategy', () => {
  const values: Record<string, string> = {
    TELEGRAM_CHAT_ID_IMAX: 'imax-chat',
    IMAX_SNAPSHOT_PATH: 'data/imax-snapshot.json',
  };
  const strategy = new ImaxWatchStrategy({
    getOrThrow: (key: string) => values[key],
  } as unknown as ConfigService);

  it('reads its label, chat and snapshot path from config', () => {
    expect(strategy.label).toBe('IMAX');
    expect(strategy.chatId).toBe('imax-chat');
    expect(strategy.snapshotPath).toBe(
      resolve(process.cwd(), 'data/imax-snapshot.json'),
    );
  });

  it('keeps only screenings with the IMAX grade code (03)', () => {
    const screenings: Screening[] = [
      buildScreening({ scnSseq: '1', tcscnsGradCd: '03' }),
      buildScreening({ scnSseq: '2', tcscnsGradCd: '01' }),
      buildScreening({ scnSseq: '3', tcscnsGradCd: '02' }),
    ];

    expect(strategy.filter(screenings).map((s) => s.scnSseq)).toEqual(['1']);
  });
});

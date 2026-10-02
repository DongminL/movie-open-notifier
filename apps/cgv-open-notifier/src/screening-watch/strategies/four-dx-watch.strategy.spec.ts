import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { Screening } from '../../cgv/dto/screening.dto';
import { FourDxWatchStrategy } from './four-dx-watch.strategy';

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

describe('FourDxWatchStrategy', () => {
  const values: Record<string, string> = {
    TELEGRAM_CHAT_ID_4DX: '4dx-chat',
    FOURDX_SNAPSHOT_PATH: 'data/4dx-snapshot.json',
  };
  const strategy = new FourDxWatchStrategy({
    getOrThrow: (key: string) => values[key],
  } as unknown as ConfigService);

  it('reads its label, chat and snapshot path from config', () => {
    expect(strategy.label).toBe('4DX');
    expect(strategy.chatId).toBe('4dx-chat');
    expect(strategy.snapshotPath).toBe(
      resolve(process.cwd(), 'data/4dx-snapshot.json'),
    );
  });

  it('keeps only screenings with the 4DX grade code (02)', () => {
    const screenings: Screening[] = [
      buildScreening({ scnSseq: '1', tcscnsGradCd: '02' }),
      buildScreening({ scnSseq: '2', tcscnsGradCd: '01' }),
      buildScreening({ scnSseq: '3', tcscnsGradCd: '03' }),
    ];

    expect(strategy.filter(screenings).map((s) => s.scnSseq)).toEqual(['1']);
  });
});

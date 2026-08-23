import { Screening } from '../../cgv/dto/screening.dto';
import { buildNewScreeningsMessage } from './watch-message';

const buildScreening = (overrides: Partial<Screening>): Screening => ({
  scnYmd: '20260825',
  scnsNo: '018',
  scnSseq: '1',
  movNm: '영화 제목',
  scnsrtTm: '1000',
  scnendTm: '1220',
  seatInfo: '100/120',
  tcscnsGradCd: '03',
  scnsEnm: 'IMAX',
  ...overrides,
});

describe('buildNewScreeningsMessage', () => {
  it('formats the added screenings into a schedule message with a booking link', () => {
    const message = buildNewScreeningsMessage('20260825', [buildScreening({})]);

    expect(message).toContain('CGV 용산아이파크몰 상영 시간표');
    expect(message).toContain('🎬 영화 제목');
    expect(message).toContain('10:00 ~ 12:20 | 좌석수: 100/120');
    expect(message).toContain('[예매하러 가기](https://cgv.co.kr');
  });
});

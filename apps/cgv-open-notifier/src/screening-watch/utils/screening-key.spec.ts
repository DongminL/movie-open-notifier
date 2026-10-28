import { Screening } from '../../cgv/dto/screening.dto';
import { buildScreeningKey } from './screening-key';

const buildScreening = (overrides: Partial<Screening>): Screening => ({
  scnYmd: '20260825',
  scnsNo: '018',
  scnSseq: '1',
  movNm: '영화 제목',
  scnsrtTm: '1000',
  scnendTm: '1220',
  seatInfo: '100/120',
  isPreparing: false,
  tcscnsGradCd: '03',
  scnsEnm: 'IMAX',
  ...overrides,
});

describe('buildScreeningKey', () => {
  it('joins scnYmd, scnsNo, scnSseq with a pipe', () => {
    expect(buildScreeningKey(buildScreening({}))).toBe('20260825|018|1');
  });

  it('appends |prep for preparing screenings so the open transition is a new key', () => {
    expect(buildScreeningKey(buildScreening({ isPreparing: true }))).toBe(
      '20260825|018|1|prep',
    );
  });
});

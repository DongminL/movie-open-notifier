import { filterImax } from './theater-type-filter';
import { Screening } from '../dto/screening.dto';

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

describe('filterImax', () => {
  it('keeps only screenings with the IMAX grade code (03)', () => {
    const screenings: Screening[] = [
      buildScreening({ scnSseq: '1', tcscnsGradCd: '03' }),
      buildScreening({ scnSseq: '2', tcscnsGradCd: '01' }),
    ];

    expect(filterImax(screenings)).toEqual([
      expect.objectContaining({ scnSseq: '1', tcscnsGradCd: '03' }),
    ]);
  });
});

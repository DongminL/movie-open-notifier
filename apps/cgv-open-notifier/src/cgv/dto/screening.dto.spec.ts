import { RawScreeningItemResponse, toScreening } from './screening.dto';

describe('toScreening (cgv)', () => {
  it('maps every field from the raw item', () => {
    const raw: RawScreeningItemResponse = {
      scnYmd: '20260826',
      scnsNo: '1',
      scnSseq: '2',
      movNm: '영화',
      scnsrtTm: '1000',
      scnendTm: '1200',
      frSeatCnt: '10',
      cpSeatCnt: '100',
      tcscnsGradCd: '04',
      scnsEnm: 'IMAX',
    };

    expect(toScreening(raw, '20260101')).toEqual({
      scnYmd: '20260826',
      scnsNo: '1',
      scnSseq: '2',
      movNm: '영화',
      scnsrtTm: '1000',
      scnendTm: '1200',
      seatInfo: '10/100',
      tcscnsGradCd: '04',
      scnsEnm: 'IMAX',
    });
  });

  it('defaults missing fields to empty string and scnYmd to the fallback', () => {
    expect(toScreening({}, '20260826')).toEqual({
      scnYmd: '20260826',
      scnsNo: '',
      scnSseq: '',
      movNm: '',
      scnsrtTm: '',
      scnendTm: '',
      seatInfo: '',
      tcscnsGradCd: '',
      scnsEnm: '',
    });
  });

  it('falls back to frSeatCnt alone when cpSeatCnt is missing', () => {
    expect(toScreening({ frSeatCnt: '7' }, '20260826').seatInfo).toBe('7');
  });
});

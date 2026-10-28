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
      isPreparing: false,
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
      isPreparing: false,
      tcscnsGradCd: '',
      scnsEnm: '',
    });
  });

  it('falls back to frSeatCnt alone when cpSeatCnt is missing', () => {
    expect(toScreening({ frSeatCnt: '7' }, '20260826').seatInfo).toBe('7');
  });

  it('marks cntlYn Y as preparing and replaces the seat info', () => {
    const screening = toScreening(
      { cntlYn: 'Y', frSeatCnt: '0', cpSeatCnt: '144' },
      '20260826',
    );

    expect(screening.isPreparing).toBe(true);
    expect(screening.seatInfo).toBe('예매 준비중');
  });

  it('keeps the seat info when cntlYn is N', () => {
    const screening = toScreening(
      { cntlYn: 'N', frSeatCnt: '10', cpSeatCnt: '144' },
      '20260826',
    );

    expect(screening.isPreparing).toBe(false);
    expect(screening.seatInfo).toBe('10/144');
  });
});

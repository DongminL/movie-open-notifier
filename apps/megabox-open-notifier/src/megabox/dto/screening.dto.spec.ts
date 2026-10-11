import { RawScreeningItemResponse, toScreening } from './screening.dto';

describe('toScreening (megabox)', () => {
  it('maps every field from the raw item', () => {
    const raw: RawScreeningItemResponse = {
      playSchdlNo: '1',
      movieNm: '영화',
      theabExpoNm: 'DOLBY CINEMA',
      playStartTime: '10:00',
      playEndTime: '12:00',
      restSeatCnt: 10,
      totSeatCnt: 100,
      playDe: '20260826',
      brchNo: '0019',
      theabKindCd: 'DBC',
      eventDivCd: 'MEK01',
    };

    expect(toScreening(raw, '20260101')).toEqual({
      playSchdlNo: '1',
      movieNm: '영화',
      screenType: 'DOLBY CINEMA',
      playStartTime: '10:00',
      playEndTime: '12:00',
      seatInfo: '10/100',
      playDe: '20260826',
      brchNo: '0019',
      theabKindCd: 'DBC',
      eventDivCd: 'MEK01',
    });
  });

  it('defaults missing fields to empty string and playDe to the fallback', () => {
    expect(toScreening({}, '20260826')).toEqual({
      playSchdlNo: '',
      movieNm: '',
      screenType: '',
      playStartTime: '',
      playEndTime: '',
      seatInfo: '',
      playDe: '20260826',
      brchNo: '',
      theabKindCd: '',
      eventDivCd: '',
    });
  });

  it('defaults null theabKindCd/eventDivCd to empty string', () => {
    const result = toScreening(
      { theabKindCd: null, eventDivCd: null },
      '20260826',
    );

    expect([result.theabKindCd, result.eventDivCd]).toEqual(['', '']);
  });

  it('keeps seatInfo when remaining seats are 0', () => {
    const result = toScreening({ restSeatCnt: 0, totSeatCnt: 100 }, '20260826');

    expect(result.seatInfo).toBe('0/100');
  });

  it('leaves seatInfo empty when either seat count is missing', () => {
    expect(toScreening({ restSeatCnt: 5 }, '20260826').seatInfo).toBe('');
  });
});

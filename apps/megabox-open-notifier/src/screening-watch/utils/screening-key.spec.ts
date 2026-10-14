import { Screening } from '../../megabox/dto/screening.dto';
import { buildScreeningKey } from './screening-key';

const buildScreening = (overrides: Partial<Screening>): Screening => ({
  playSchdlNo: '2608260019001',
  movieNm: '영화 제목',
  screenType: 'DOLBY CINEMA [Laser]',
  playStartTime: '10:00',
  playEndTime: '12:20',
  seatInfo: '100/290',
  playDe: '20260826',
  brchNo: '0019',
  theabKindCd: 'DBC',
  eventDivCd: '',
  ...overrides,
});

describe('buildScreeningKey', () => {
  it('uses playSchdlNo as-is since it already uniquely identifies a showing', () => {
    expect(
      buildScreeningKey(buildScreening({ playSchdlNo: '2608260019003' })),
    ).toBe('2608260019003');
  });
});

import { Screening } from '../../megabox/dto/screening.dto';
import { buildNewScreeningsMessage } from './watch-message';

const buildScreening = (overrides: Partial<Screening>): Screening => ({
  playSchdlNo: '2608260019001',
  movieNm: '영화 제목',
  screenType: 'DOLBY CINEMA [Laser]',
  playStartTime: '10:00',
  playEndTime: '12:20',
  seatInfo: '100/290',
  playDe: '20260826',
  ...overrides,
});

describe('buildNewScreeningsMessage', () => {
  it('formats the added screenings into a schedule message with a booking link', () => {
    const message = buildNewScreeningsMessage('20260826', [buildScreening({})]);

    expect(message).toContain(
      '메가박스 남양주현대아울렛스페이스원 상영 시간표',
    );
    expect(message).toContain('2026년 08월 26일');
    expect(message).toContain('🎬 영화 제목');
    expect(message).toContain('10:00 ~ 12:20 | 좌석수: 100/290');
    expect(message).toContain(
      '[예매하러 가기](https://www.megabox.co.kr/specialtheater/dolby/time?brchNo=0019&playDe=20260826)',
    );
  });
});

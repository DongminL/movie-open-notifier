import { buildScheduleMessage, MovieTimeOption } from './movie-time';

describe('buildScheduleMessage', () => {
  it('formats a movie time map into a readable schedule message', () => {
    const map = new Map<string, MovieTimeOption[]>();
    map.set('영화 제목', [
      {
        startTime: '10:00',
        endTime: '12:20',
        movie: '영화 제목',
        screenType: 'IMAX',
        seatInfo: '100/120',
      },
    ]);

    const result = buildScheduleMessage(map, '용산아이파크몰', '20260825');

    expect(result).toContain('CGV 용산아이파크몰 상영 시간표');
    expect(result).toContain('2026년 08월 25일');
    expect(result).toContain('🎬 영화 제목');
    expect(result).toContain('10:00 ~ 12:20 | 좌석수: 100/120');
  });

  it('throws when the date is not 8 digits', () => {
    expect(() =>
      buildScheduleMessage(new Map(), '용산아이파크몰', '2026825'),
    ).toThrow('date의 형식은 20250101 이어야 합니다.');
  });
});

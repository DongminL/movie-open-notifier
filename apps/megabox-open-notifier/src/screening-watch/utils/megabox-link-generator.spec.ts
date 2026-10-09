import { buildMegaboxWebUrl } from './megabox-link-generator';

describe('buildMegaboxWebUrl', () => {
  it('builds the branch timetable link with brchNo and playDe query params', () => {
    const url = buildMegaboxWebUrl({ brchNo: '0019', playDe: '20260826' });

    expect(url).toBe(
      'https://www.megabox.co.kr/theater/time?brchNo=0019&playDe=20260826',
    );
  });
});

import { buildMegaboxWebUrl } from './megabox-link-generator';

describe('buildMegaboxWebUrl', () => {
  it('builds a Megabox timetable link with brchNo and playDe query params', () => {
    const url = buildMegaboxWebUrl({ brchNo: '0019', playDe: '20260826' });

    expect(url).toBe(
      'https://www.megabox.co.kr/specialtheater/dolby/time?brchNo=0019&playDe=20260826',
    );
  });
});

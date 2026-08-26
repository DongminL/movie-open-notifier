import { Screening } from '../../megabox/dto/screening.dto';
import { BRCH_NO } from '../../megabox/megabox-schedule-fetcher.service';
import { buildMegaboxWebUrl } from './megabox-link-generator';

export const WATCH_THEATER = '남양주현대아울렛스페이스원';

/** 날짜 하나에 대한 신규 상영 알림 메시지 */
export function buildNewScreeningsMessage(
  date: string,
  added: Screening[],
): string {
  const movieGroups = new Map<string, Screening[]>();

  for (const s of [...added].sort((a, b) =>
    a.playStartTime.localeCompare(b.playStartTime),
  )) {
    if (!movieGroups.has(s.movieNm)) {
      movieGroups.set(s.movieNm, []);
    }
    movieGroups.get(s.movieNm)?.push(s);
  }

  let body =
    `메가박스 ${WATCH_THEATER} 상영 시간표\n` +
    `${date.substring(0, 4)}년 ${date.substring(4, 6)}월 ${date.substring(6, 8)}일\n` +
    'DOLBY CINEMA 오픈\n\n';

  movieGroups.forEach((list, movie) => {
    body += `🎬 ${movie}\n`;
    list.forEach((s) => {
      body += `${s.playStartTime} ~ ${s.playEndTime} | 좌석수: ${s.seatInfo}\n`;
    });
    body += '\n';
  });

  body += `[예매하러 가기](${buildMegaboxWebUrl({ brchNo: BRCH_NO, playDe: date })})`;

  return body;
}

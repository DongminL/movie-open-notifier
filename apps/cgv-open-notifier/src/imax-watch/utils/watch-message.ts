import { Screening } from '../../cgv/dto/screening.dto';
import { buildCgvWebUrl, CgvParams } from '../../cgv/utils/cgv-link-generator';
import {
  buildScheduleMessage,
  MovieTimeOption,
} from '../../cgv/utils/movie-time';

export const WATCH_THEATER = '용산아이파크몰';
const WATCH_SITE_NO = '0013';

/** API Response의 시간 문자열("2000")을 화면 표기용 HH:MM으로 변환 */
const formatTime = (raw: string): string =>
  raw.length === 4 ? `${raw.substring(0, 2)}:${raw.substring(2, 4)}` : raw;

/** 날짜 하나에 대한 신규 상영 알림 메시지 */
export function buildNewScreeningsMessage(
  date: string,
  added: Screening[],
): string {
  const movieTimeMap = new Map<string, MovieTimeOption[]>();

  for (const s of [...added].sort((a, b) =>
    a.scnsrtTm.localeCompare(b.scnsrtTm),
  )) {
    if (!movieTimeMap.has(s.movNm)) {
      movieTimeMap.set(s.movNm, []);
    }
    movieTimeMap.get(s.movNm)?.push({
      screenType: s.scnsEnm,
      movie: s.movNm,
      seatInfo: s.seatInfo,
      startTime: formatTime(s.scnsrtTm),
      endTime: formatTime(s.scnendTm),
    });
  }

  const cgvParams: CgvParams = {
    siteNo: WATCH_SITE_NO,
    siteNm: WATCH_THEATER,
    scnYmd: date,
  };
  let body = buildScheduleMessage(movieTimeMap, WATCH_THEATER, date);
  body += `[예매하러 가기](${buildCgvWebUrl(cgvParams)})`;

  return body;
}

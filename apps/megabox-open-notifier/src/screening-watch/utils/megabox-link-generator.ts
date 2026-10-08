export interface MegaboxParams {
  /** 지점 코드 (예: 남양주현대아울렛스페이스원 = '0019') */
  brchNo: string;
  /** 상영 날짜 YYYYMMDD (예: '20260826') */
  playDe: string;
}

/** 지점 전체 상영시간표 페이지 URL 생성 */
export function buildMegaboxWebUrl(params: MegaboxParams): string {
  const { brchNo, playDe } = params;
  const query = new URLSearchParams({ brchNo, playDe });
  return `https://www.megabox.co.kr/theater/time?${query.toString()}`;
}

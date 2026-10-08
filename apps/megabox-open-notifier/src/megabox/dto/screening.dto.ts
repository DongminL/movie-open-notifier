/** Megabox schedulePage.do 응답 원본 항목 (megaMap.movieFormList) */
export interface RawScreeningItemResponse {
  playSchdlNo?: string;
  movieNm?: string;
  theabExpoNm?: string;
  playStartTime?: string;
  playEndTime?: string;
  restSeatCnt?: number;
  totSeatCnt?: number;
  playDe?: string;
  theabKindCd?: string | null;
  eventDivCd?: string | null;
}

export interface SchedulePageResponse {
  statCd?: number;
  megaMap?: {
    movieFormList?: RawScreeningItemResponse[];
  };
}

/** 알림/diff에 사용할 정제된 상영 정보 */
export interface Screening {
  playSchdlNo: string;
  movieNm: string;
  screenType: string;
  playStartTime: string;
  playEndTime: string;
  seatInfo: string;
  playDe: string;
  /** 상영관 종류 코드 (DBC = DOLBY CINEMA) */
  theabKindCd: string;
  /** 이벤트 구분 코드 (MEK01 = 무대인사, MEK06 = GV). 이벤트가 아니면 빈 문자열 */
  eventDivCd: string;
}

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
}

/** CGV searchMovScnInfo API 응답 원본 항목 */
export interface RawScreeningItemResponse {
  scnYmd?: string;
  scnsNo?: string;
  scnSseq?: string;
  movNm?: string;
  scnsrtTm?: string;
  scnendTm?: string;
  frSeatCnt?: string;
  cpSeatCnt?: string;
  tcscnsGradCd?: string;
  scnsEnm?: string;
}

export interface SearchMovScnInfoResponse {
  data?: RawScreeningItemResponse[];
}

/** 알림/diff에 사용할 정제된 상영 정보 */
export interface Screening {
  scnYmd: string;
  scnsNo: string;
  scnSseq: string;
  movNm: string;
  scnsrtTm: string;
  scnendTm: string;
  seatInfo: string;
  tcscnsGradCd: string;
  scnsEnm: string;
}

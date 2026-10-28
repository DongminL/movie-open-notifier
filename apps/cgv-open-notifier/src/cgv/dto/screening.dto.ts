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
  cntlYn?: string;
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
  /** 예매 준비중 여부 (cntlYn === 'Y') */
  isPreparing: boolean;
  tcscnsGradCd: string;
  scnsEnm: string;
}

const PREPARING_SEAT_INFO = '예매 준비중';

/** 원본 응답 항목을 Screening으로 변환 (누락 값은 빈 문자열, scnYmd는 조회 날짜로 대체) */
export function toScreening(
  item: RawScreeningItemResponse,
  fallbackScnYmd: string,
): Screening {
  const isPreparing = item.cntlYn === 'Y';
  return {
    scnYmd: item.scnYmd ?? fallbackScnYmd,
    scnsNo: item.scnsNo ?? '',
    scnSseq: item.scnSseq ?? '',
    movNm: item.movNm ?? '',
    scnsrtTm: item.scnsrtTm ?? '',
    scnendTm: item.scnendTm ?? '',
    seatInfo: isPreparing
      ? PREPARING_SEAT_INFO
      : item.frSeatCnt && item.cpSeatCnt
        ? `${item.frSeatCnt}/${item.cpSeatCnt}`
        : (item.frSeatCnt ?? ''),
    isPreparing,
    tcscnsGradCd: item.tcscnsGradCd ?? '',
    scnsEnm: item.scnsEnm ?? '',
  };
}

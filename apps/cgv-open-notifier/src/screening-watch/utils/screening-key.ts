import { Screening } from '../../cgv/dto/screening.dto';

// 스냅샷에 저장되는 회차 키: "scnYmd|scnsNo|scnSseq"
// (예매 준비중이면 "|prep" 접미사 추가)
export const buildScreeningKey = (s: Screening): string =>
  `${s.scnYmd}|${s.scnsNo}|${s.scnSseq}${s.isPreparing ? '|prep' : ''}`;

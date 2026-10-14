import { Screening } from '../../cgv/dto/screening.dto';

// 스냅샷에 저장되는 회차 키: "scnYmd|scnsNo|scnSseq"
export const buildScreeningKey = (s: Screening): string =>
  `${s.scnYmd}|${s.scnsNo}|${s.scnSseq}`;

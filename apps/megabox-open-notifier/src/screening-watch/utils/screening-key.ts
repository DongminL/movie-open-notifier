import { Screening } from '../../megabox/dto/screening.dto';

// playSchdlNo 하나로 상영 회차가 이미 고유해 필드 조합이 불필요하다.
export const buildScreeningKey = (s: Screening): string => s.playSchdlNo;

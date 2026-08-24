import { Screening } from '../dto/screening.dto';

const IMAX_GRADE_CD = '03';

export function filterImax(list: Screening[]): Screening[] {
  return list.filter((item) => item.tcscnsGradCd === IMAX_GRADE_CD);
}

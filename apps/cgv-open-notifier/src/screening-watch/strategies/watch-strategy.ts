import { Screening } from '../../cgv/dto/screening.dto';

export const WATCH_STRATEGIES = Symbol('WATCH_STRATEGIES');

/** 감시 대상 상영 포맷별로 달라지는 부분 (조회/diff/알림 흐름은 서비스가 공통 처리) */
export interface WatchStrategy {
  readonly label: string;
  readonly snapshotPath: string;
  readonly chatId: string;
  filter(screenings: Screening[]): Screening[];
}

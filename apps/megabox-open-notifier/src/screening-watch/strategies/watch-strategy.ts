import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { Branch } from '../../megabox/branches';
import { Screening } from '../../megabox/dto/screening.dto';
import { buildMegaboxWebUrl } from '../utils/megabox-link-generator';

export const WATCH_STRATEGIES = Symbol('WATCH_STRATEGIES');

/** 감시 대상 (상영 유형 × 지점)별로 달라지는 부분 (조회/diff/알림 흐름은 서비스가 공통 처리) */
export interface WatchStrategy {
  readonly label: string;
  readonly theaterName: string;
  readonly snapshotPath: string;
  readonly chatId: string;
  /** 포럼형 그룹의 토픽(message_thread_id). 없으면 채팅방 기본 위치로 전송 */
  readonly threadId?: number;
  filter(screenings: Screening[]): Screening[];
  buildBookingUrl(date: string): string;
}

/*
 * 지점 하나에 묶이는 전략의 공통부.
 * - 토픽: {topicIdKeyPrefix}_{brchNo} (상영 유형 × 지점별 토픽)
 * - 스냅샷: 설정 경로를 기준으로 모든 지점의 파일명에 지점 코드를 붙인다
 *   (예: data/dolby-snapshot.json → data/dolby-snapshot-0019.json)
 */
export abstract class BranchWatchStrategy implements WatchStrategy {
  abstract readonly label: string;
  readonly theaterName: string;
  readonly chatId: string;
  readonly threadId?: number;
  readonly snapshotPath: string;

  protected constructor(
    configService: ConfigService,
    protected readonly branch: Branch,
    chatIdKey: string,
    snapshotPathKey: string,
    topicIdKeyPrefix: string,
  ) {
    this.theaterName = branch.name;
    this.chatId = configService.getOrThrow<string>(chatIdKey);
    this.threadId = configService.get<number>(
      `${topicIdKeyPrefix}_${branch.brchNo}`,
    );

    const basePath = resolve(
      process.cwd(),
      configService.getOrThrow<string>(snapshotPathKey),
    );
    this.snapshotPath = basePath.replace(/(\.json)?$/, `-${branch.brchNo}$1`);
  }

  abstract filter(screenings: Screening[]): Screening[];

  buildBookingUrl(date: string): string {
    return buildMegaboxWebUrl({ brchNo: this.branch.brchNo, playDe: date });
  }

  protected inBranch(screenings: Screening[]): Screening[] {
    return screenings.filter((s) => s.brchNo === this.branch.brchNo);
  }
}

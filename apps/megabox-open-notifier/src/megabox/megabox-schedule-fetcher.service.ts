import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WATCH_BRANCHES } from './branches';
import {
  Screening,
  SchedulePageResponse,
  RawScreeningItemResponse,
  toScreening,
} from './dto/screening.dto';

const RESPONSE_TIMEOUT_MS = 15000;

/*
 * 감시 대상 전 지점의 하루치 전체 상영정보를 한 번의 요청(brchNo1..N)으로 가져오기
 * 지점 구분은 응답의 brchNo, 돌비시네마/무대인사/GV 구분은 theabKindCd, eventDivCd로
 * 전략(WatchStrategy)이 필터링
 */
@Injectable()
export class MegaboxScheduleFetcherService {
  private readonly scheduleUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.scheduleUrl = this.configService.getOrThrow<string>(
      'MEGABOX_SCHEDULE_URL',
    );
  }

  async fetchScreenings(playDe: string): Promise<Screening[]> {
    const res = await fetch(this.scheduleUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        masterType: 'brch',
        firstAt: 'N',
        playDe,
        ...Object.fromEntries(
          WATCH_BRANCHES.map((b, i) => [`brchNo${i + 1}`, b.brchNo]),
        ),
      }),
      signal: AbortSignal.timeout(RESPONSE_TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new Error(`메가박스 스케줄 조회 실패: HTTP ${res.status}`);
    }

    const body = (await res.json()) as SchedulePageResponse;
    if (body.statCd !== 0) {
      throw new Error(`메가박스 스케줄 조회 실패: statCd=${body.statCd}`);
    }

    return this.parseScreenings(body, playDe);
  }

  private parseScreenings(
    body: SchedulePageResponse,
    playDe: string,
  ): Screening[] {
    const items: RawScreeningItemResponse[] = body.megaMap?.movieFormList ?? [];

    // 지점 구분이 brchNo에 의존하므로, 응답 구조가 바뀌어 전부 비면 빈 결과로 오인해
    // 스냅샷이 비워지고 이후 전 회차가 신규로 알려지지 않도록 오류로 처리한다
    if (items.length > 0 && items.every((item) => !item.brchNo)) {
      throw new Error(
        '메가박스 스케줄 응답에 brchNo가 없습니다 (응답 구조 변경 가능성)',
      );
    }

    return items.map((item) => toScreening(item, playDe));
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Screening,
  SchedulePageResponse,
  RawScreeningItemResponse,
} from './dto/screening.dto';

const RESPONSE_TIMEOUT_MS = 15000;
export const BRCH_NO = '0019'; // 남양주현대아울렛스페이스원
const THEAB_KIND_CD = 'DBC'; // DOLBY CINEMA

/*
 * 메가박스 돌비시네마 상영정보 가져오기
 * theabKindCd1=DBC로 요청하면 서버가 돌비시네마 상영만 걸러서 반환
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
        detailType: 'spcl',
        firstAt: 'N',
        playDe,
        brchNo1: BRCH_NO,
        spclbYn1: 'Y',
        theabKindCd1: THEAB_KIND_CD,
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

    return items.map((item) => ({
      playSchdlNo: item.playSchdlNo ?? '',
      movieNm: item.movieNm ?? '',
      screenType: item.theabExpoNm ?? '',
      playStartTime: item.playStartTime ?? '',
      playEndTime: item.playEndTime ?? '',
      seatInfo:
        item.restSeatCnt != null && item.totSeatCnt != null
          ? `${item.restSeatCnt}/${item.totSeatCnt}`
          : '',
      playDe: item.playDe ?? playDe,
    }));
  }
}

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { resolve } from 'path';
import { getErrorStack, sleep } from '@app/common';
import { MegaboxScheduleFetcherService } from '../megabox/megabox-schedule-fetcher.service';
import { Screening } from '../megabox/dto/screening.dto';
import { TelegramService } from '@app/telegram';
import { buildDateRange } from './utils/date-range';
import {
  buildScreeningKey,
  diffNewScreenings,
  hasSnapshotChanged,
  loadSnapshot,
  saveSnapshot,
  Snapshot,
} from './utils/snapshot';
import {
  buildNewScreeningsMessage,
  WATCH_THEATER,
} from './utils/watch-message';

const TIMEOUT_NAME = 'dolby-watch-cycle';
const ERROR_NOTIFY_THRESHOLD = 5; // 연속 사이클 오류 알림 임계치

/*
 * 날짜 상관없이 남양주현대아울렛스페이스원 DOLBY CINEMA의 신규 오픈/회차 추가를
 * 감지하는 감시자. 서버 기동 시 자동으로 시작되어, 사이클마다 horizonDays 만큼의
 * 날짜를 조회해 이전 스냅샷과 diff한다. 사이클 사이 대기 시간은 설정값 ±5초 랜덤.
 */
@Injectable()
export class DolbyWatchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DolbyWatchService.name);

  private readonly horizonDays: number;
  private readonly pollIntervalSec: number;
  private readonly snapshotPath: string;

  private previousSnapshot: Snapshot = {};
  private isColdStart = true;
  private consecutiveErrors = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly fetcher: MegaboxScheduleFetcherService,
    private readonly telegramService: TelegramService,
  ) {
    this.horizonDays =
      this.configService.getOrThrow<number>('WATCH_HORIZON_DAYS');
    this.pollIntervalSec = this.configService.getOrThrow<number>(
      'WATCH_POLL_INTERVAL_SEC',
    );
    this.snapshotPath = resolve(
      process.cwd(),
      this.configService.getOrThrow<string>('DOLBY_SNAPSHOT_PATH'),
    );
  }

  onApplicationBootstrap(): void {
    this.restoreSnapshot();
    this.runAndScheduleNext();
  }

  private runAndScheduleNext(): void {
    this.runCycle()
      .then(() => {
        this.consecutiveErrors = 0;
      })
      .catch((err: unknown) => {
        this.logger.error('사이클 오류', getErrorStack(err));
        this.consecutiveErrors++;
        if (this.consecutiveErrors >= ERROR_NOTIFY_THRESHOLD) {
          void this.telegramService.sendMessage(
            'DOLBY CINEMA 감시 중 오류가 반복되고 있습니다. 감시는 계속됩니다.',
          );
          this.consecutiveErrors = 0;
        }
      })
      .finally(() => {
        this.scheduleNextCycle();
      });
  }

  /** 다음 사이클을 설정값 ±5초 랜덤 지연 뒤로 1회성 예약 (재귀 호출로 계속 이어짐) */
  private scheduleNextCycle(): void {
    if (this.schedulerRegistry.doesExist('timeout', TIMEOUT_NAME)) {
      this.schedulerRegistry.deleteTimeout(TIMEOUT_NAME);
    }

    const jitterSec = this.pollIntervalSec - 5 + Math.random() * 10;
    const delayMs = Math.max(0, jitterSec) * 1000;

    const timeout = setTimeout(() => this.runAndScheduleNext(), delayMs);
    this.schedulerRegistry.addTimeout(TIMEOUT_NAME, timeout);
  }

  /*
   * 오늘부터 horizonDays 만큼 조회. 날짜별로 조회 즉시 이전 스냅샷과 diff해서
   * 신규 발견 시 그 날짜 하나만 담아 바로 알린다 (한 사이클 전체를 모아 보내면
   * 텔레그램 메시지 길이 제한(4096자)에 걸릴 수 있어 날짜 단위로 쪼갬).
   */
  private async runCycle(): Promise<void> {
    const dates = buildDateRange(this.horizonDays);
    const currentSnapshot: Snapshot = {};
    let coldStartTotal = 0;
    let notified = false;
    let snapshotChanged = false;

    this.logger.log(`사이클 시작 (${dates.length}일치 조회)`);
    const cycleStartedAt = Date.now();

    for (let i = 0; i < dates.length; i++) {
      const date = dates[i];

      let screenings: Screening[] | null = null;
      try {
        screenings = await this.fetcher.fetchScreenings(date);
      } catch (err) {
        this.logger.error(`${date} 조회 실패, 건너뜀`, getErrorStack(err));
      }

      if (screenings) {
        const keys = screenings.map(buildScreeningKey);
        currentSnapshot[date] = keys;

        const prevKeys = this.previousSnapshot[date];
        if (hasSnapshotChanged(prevKeys, keys)) {
          snapshotChanged = true;
        }

        if (this.isColdStart) {
          coldStartTotal += keys.length;
        } else {
          const newScreenings = diffNewScreenings(prevKeys, screenings, keys);

          if (newScreenings.length > 0) {
            this.logger.log(
              `${date} 신규 ${newScreenings.length}건 발견 — 알림 전송`,
            );
            await this.telegramService.sendMessage(
              buildNewScreeningsMessage(date, newScreenings),
            );
            notified = true;
          }
        }

        this.logger.log(
          `(${i + 1}/${dates.length}) ${date} DOLBY CINEMA ${screenings.length}건`,
        );
      }

      await sleep(300 + Math.random() * 1200); // 요청 간격 확보용 소폭 랜덤 대기 (0.3~1.5초)
    }

    this.logger.log(
      `사이클 종료 (${Math.round((Date.now() - cycleStartedAt) / 1000)}초 소요)`,
    );

    // 이번 사이클에 조회 실패한 날짜는 currentSnapshot에 없음 — 그대로 교체하면
    // 그 날짜의 기존 상태가 유실되어 다음에 성공했을 때 전부 "신규"로 오인될 수 있으므로,
    // 실패한 날짜는 이전 스냅샷 값을 그대로 보존한다(스프레드 덮어쓰기로 자동 처리됨).
    const mergedSnapshot: Snapshot = {
      ...this.previousSnapshot,
      ...currentSnapshot,
    };

    this.previousSnapshot = mergedSnapshot;
    if (snapshotChanged) {
      await saveSnapshot(this.snapshotPath, mergedSnapshot);
    }

    if (this.isColdStart) {
      this.isColdStart = false;
      await this.telegramService.sendMessage(
        `${WATCH_THEATER} DOLBY CINEMA 감시를 시작했습니다.\n` +
          `현재 예정된 DOLBY CINEMA 상영: ${coldStartTotal}건\n` +
          `앞으로 새로 열리는 상영만 알려드립니다.`,
      );
    } else if (!notified) {
      this.logger.log('신규 상영 없음 — 알림 없이 대기 (정상 동작)');
    }
  }

  private restoreSnapshot(): void {
    try {
      const snapshot = loadSnapshot(this.snapshotPath);
      this.previousSnapshot = snapshot ?? {};
      this.isColdStart = snapshot === null;
    } catch (err) {
      this.logger.error(
        '스냅샷 로드 실패, 콜드 스타트로 진행',
        getErrorStack(err),
      );
      this.previousSnapshot = {};
      this.isColdStart = true;
    }
  }
}

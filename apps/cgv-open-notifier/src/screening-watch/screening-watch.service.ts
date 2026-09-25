import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { getErrorStack, sleep } from '@app/common';
import { CgvScheduleFetcherService } from '../cgv/cgv-schedule-fetcher.service';
import { Screening } from '../cgv/dto/screening.dto';
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
import { WATCH_STRATEGIES, WatchStrategy } from './strategies/watch-strategy';

const TIMEOUT_NAME = 'screening-watch-cycle';
const ERROR_NOTIFY_THRESHOLD = 5; // 연속 사이클 오류 알림 임계치

/** 전략(포맷)별 감시 상태. 사이클 시작 시 currentSnapshot 이하 필드는 초기화된다. */
interface WatchState {
  strategy: WatchStrategy;
  previousSnapshot: Snapshot;
  isColdStart: boolean;
  currentSnapshot: Snapshot;
  coldStartTotal: number;
  notifiedCount: number;
  snapshotChanged: boolean;
}

/*
 * 날짜 상관없이 용산 특별관(IMAX, 4DX 등)의 신규 오픈/회차 추가를 감지하는 감시자.
 * 서버 기동 시 자동으로 시작되어, 사이클마다 horizonDays 만큼의 날짜를 조회한다.
 * 날짜당 API는 1번만 호출하고, 그 응답을 전략(WatchStrategy)별로 필터링해
 * 각자의 스냅샷과 diff한 뒤 각자의 채팅방으로 알린다.
 * 사이클 사이 대기 시간은 설정값 ±5초 랜덤.
 */
@Injectable()
export class ScreeningWatchService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScreeningWatchService.name);

  private readonly horizonDays: number;
  private readonly pollIntervalSec: number;
  private readonly states: WatchState[];

  private consecutiveErrors = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly fetcher: CgvScheduleFetcherService,
    private readonly telegramService: TelegramService,
    @Inject(WATCH_STRATEGIES) strategies: WatchStrategy[],
  ) {
    this.horizonDays =
      this.configService.getOrThrow<number>('WATCH_HORIZON_DAYS');
    this.pollIntervalSec = this.configService.getOrThrow<number>(
      'WATCH_POLL_INTERVAL_SEC',
    );
    this.states = strategies.map((strategy) => ({
      strategy,
      previousSnapshot: {},
      isColdStart: true,
      currentSnapshot: {},
      coldStartTotal: 0,
      notifiedCount: 0,
      snapshotChanged: false,
    }));
  }

  onApplicationBootstrap(): void {
    this.states.forEach((state) => this.restoreSnapshot(state));
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
          // 오류는 전략 공통이므로 각 전략의 채팅방에 1회씩 알린다
          const chatIds = new Set(this.states.map((s) => s.strategy.chatId));
          chatIds.forEach((chatId) => {
            void this.telegramService.sendMessage(
              'CGV 감시 중 오류가 반복되고 있습니다. 감시는 계속됩니다.',
              chatId,
            );
          });
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
   * 오늘부터 horizonDays 만큼 조회. 날짜별로 조회 즉시 전략별로 이전 스냅샷과 diff해서
   * 신규 발견 시 그 날짜 하나만 담아 바로 알린다 (한 사이클 전체를 모아 보내면
   * 텔레그램 메시지 길이 제한(4096자)에 걸릴 수 있어 날짜 단위로 쪼갬).
   */
  private async runCycle(): Promise<void> {
    const dates = buildDateRange(this.horizonDays);
    this.states.forEach((state) => this.resetCycleState(state));

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
        await this.forEachStrategy((state) =>
          this.processDate(state, date, screenings, i, dates.length),
        );
      }

      await sleep(300 + Math.random() * 1200); // 차단 회피용 소폭 랜덤 대기 (0.3~1.5초)
    }

    this.logger.log(
      `사이클 종료 (${Math.round((Date.now() - cycleStartedAt) / 1000)}초 소요)`,
    );

    await this.forEachStrategy((state) => this.finishCycle(state));
  }

  /*
   * 전략들을 병렬로 실행하되 한 전략의 실패가 다른 전략을 막지 않도록 격리한다.
   * 실패는 전략 라벨과 함께 로그로 남기고, 전부 실패했을 때만 사이클 오류로 전파해
   * 연속 오류 알림(ERROR_NOTIFY_THRESHOLD)이 동작하게 한다.
   */
  private async forEachStrategy(
    task: (state: WatchState) => Promise<void>,
  ): Promise<void> {
    const results = await Promise.allSettled(
      this.states.map((state) => task(state)),
    );

    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `${this.states[idx].strategy.label} 처리 실패`,
          getErrorStack(result.reason as unknown),
        );
      }
    });

    if (results.every((result) => result.status === 'rejected')) {
      throw new Error('모든 전략 처리에 실패했습니다.');
    }
  }

  private resetCycleState(state: WatchState): void {
    state.currentSnapshot = {};
    state.coldStartTotal = 0;
    state.notifiedCount = 0;
    state.snapshotChanged = false;
  }

  /** 한 날짜의 전체 응답에서 해당 전략 대상만 추려 diff/알림 */
  private async processDate(
    state: WatchState,
    date: string,
    allScreenings: Screening[],
    index: number,
    total: number,
  ): Promise<void> {
    const { label, chatId } = state.strategy;
    const screenings = state.strategy.filter(allScreenings);
    const keys = screenings.map(buildScreeningKey);
    state.currentSnapshot[date] = keys;

    const prevKeys = state.previousSnapshot[date];
    if (hasSnapshotChanged(prevKeys, keys)) {
      state.snapshotChanged = true;
    }

    if (state.isColdStart) {
      state.coldStartTotal += keys.length;
    } else {
      const newScreenings = diffNewScreenings(prevKeys, screenings, keys);

      if (newScreenings.length > 0) {
        this.logger.log(
          `${date} ${label} 신규 ${newScreenings.length}건 발견 — 알림 전송`,
        );
        await this.telegramService.sendMessage(
          buildNewScreeningsMessage(date, label, newScreenings),
          chatId,
        );
        state.notifiedCount += newScreenings.length;
      }
    }

    this.logger.log(
      `(${index + 1}/${total}) ${date} ${label} ${screenings.length}건`,
    );
  }

  private async finishCycle(state: WatchState): Promise<void> {
    const { label, chatId, snapshotPath } = state.strategy;

    // 이번 사이클에 조회 실패한 날짜는 currentSnapshot에 없음 — 그대로 교체하면
    // 그 날짜의 기존 상태가 유실되어 다음에 성공했을 때 전부 "신규"로 오인될 수 있으므로,
    // 실패한 날짜는 이전 스냅샷 값을 그대로 보존한다(스프레드 덮어쓰기로 자동 처리됨).
    const mergedSnapshot: Snapshot = {
      ...state.previousSnapshot,
      ...state.currentSnapshot,
    };

    state.previousSnapshot = mergedSnapshot;
    if (state.snapshotChanged) {
      await saveSnapshot(snapshotPath, mergedSnapshot);
    }

    if (state.isColdStart) {
      state.isColdStart = false;
      await this.telegramService.sendMessage(
        `${WATCH_THEATER} ${label} 감시를 시작했습니다.\n` +
          `현재 예정된 ${label} 상영: ${state.coldStartTotal}건\n` +
          `앞으로 새로 열리는 상영만 알려드립니다.`,
        chatId,
      );
    } else if (state.notifiedCount === 0) {
      this.logger.log(`${label} 신규 상영 없음 — 알림 없이 대기 (정상 동작)`);
    }
  }

  private restoreSnapshot(state: WatchState): void {
    const { label, snapshotPath } = state.strategy;
    try {
      const snapshot = loadSnapshot(snapshotPath);
      state.previousSnapshot = snapshot ?? {};
      state.isColdStart = snapshot === null;
    } catch (err) {
      this.logger.error(
        `${label} 스냅샷 로드 실패, 콜드 스타트로 진행`,
        getErrorStack(err),
      );
      state.previousSnapshot = {};
      state.isColdStart = true;
    }
  }
}

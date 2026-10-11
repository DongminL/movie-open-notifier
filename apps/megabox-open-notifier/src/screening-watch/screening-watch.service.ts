import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
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
import { buildNewScreeningsMessage } from './utils/watch-message';
import { WATCH_STRATEGIES, WatchStrategy } from './strategies/watch-strategy';

const TIMEOUT_NAME = 'screening-watch-cycle';
const ERROR_NOTIFY_THRESHOLD = 5; // 연속 사이클 오류 알림 임계치

/** 로그/알림에서 감시 대상을 구분하는 이름 (지점 + 상영 유형) */
const watchName = ({ theaterName, label }: WatchStrategy): string =>
  `${theaterName} ${label}`;

/** 전략(상영 유형 × 지점)별 감시 상태. 사이클 시작 시 currentSnapshot 이하 필드는 초기화된다. */
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
 * 날짜 상관없이 감시 대상 지점들의 DOLBY CINEMA, 무대인사, GV 등
 * 신규 오픈/회차 추가를 감지하는 감시자. 서버 기동 시 자동으로 시작되어,
 * 사이클마다 horizonDays 만큼의 날짜를 조회한다.
 * 날짜당 API는 전 지점 합쳐 1번만 호출하고, 그 응답을 전략(상영 유형 × 지점)별로 필터링해
 * 각자의 스냅샷과 diff한 뒤 각자의 채팅방(지점 토픽)으로 알린다.
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
    private readonly fetcher: MegaboxScheduleFetcherService,
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
              '메가박스 감시 중 오류가 반복되고 있습니다. 감시는 계속됩니다.',
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

      await sleep(300 + Math.random() * 1200); // 요청 간격 확보용 소폭 랜덤 대기 (0.3~1.5초)
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
          `${watchName(this.states[idx].strategy)} 처리 실패`,
          getErrorStack(result.reason as unknown),
        );
      }
    });

    if (results.every((result) => result.status === 'rejected')) {
      throw new Error('모든 처리가 실패했습니다.');
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
    const { label, chatId, threadId, theaterName } = state.strategy;
    const name = watchName(state.strategy);
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
          `${date} ${name} 신규 ${newScreenings.length}건 발견 — 알림 전송`,
        );
        const sent = await this.telegramService.sendMessage(
          buildNewScreeningsMessage(
            date,
            label,
            newScreenings,
            state.strategy.buildBookingUrl(date),
            theaterName,
          ),
          chatId,
          threadId,
        );

        if (sent === false) {
          // 이 날짜를 스냅샷에 반영하지 않아 다음 사이클에 다시 신규로 감지·재전송한다
          this.logger.warn(
            `${date} ${name} 알림 전송 실패 — 다음 사이클에 다시 시도`,
          );
          if (prevKeys) {
            state.currentSnapshot[date] = prevKeys;
          } else {
            delete state.currentSnapshot[date];
          }
        } else {
          state.notifiedCount += newScreenings.length;
        }
      }
    }

    this.logger.log(
      `(${index + 1}/${total}) ${date} ${name} ${screenings.length}건`,
    );
  }

  private async finishCycle(state: WatchState): Promise<void> {
    const { chatId, threadId, snapshotPath } = state.strategy;
    const name = watchName(state.strategy);

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
      const sent = await this.telegramService.sendMessage(
        `${name} 감시를 시작했습니다.\n` +
          `현재 예정된 ${state.strategy.label} 상영: ${state.coldStartTotal}건\n` +
          `앞으로 새로 열리는 상영만 알려드립니다.`,
        chatId,
        threadId,
      );

      if (sent === false) {
        // 시작 알림이 도착해야 설정(채팅방/토픽)이 정상임을 알 수 있으므로 다음 사이클에 다시 보낸다
        this.logger.warn(
          `${name} 시작 알림 전송 실패 — 다음 사이클에 다시 시도`,
        );
      } else {
        state.isColdStart = false;
      }
    } else if (state.notifiedCount === 0) {
      this.logger.log(`${name} 신규 상영 없음 — 알림 없이 대기 (정상 동작)`);
    }
  }

  private restoreSnapshot(state: WatchState): void {
    const { snapshotPath } = state.strategy;
    try {
      const snapshot = loadSnapshot(snapshotPath);
      state.previousSnapshot = snapshot ?? {};
      state.isColdStart = snapshot === null;
    } catch (err) {
      this.logger.error(
        `${watchName(state.strategy)} 스냅샷 로드 실패, 콜드 스타트로 진행`,
        getErrorStack(err),
      );
      state.previousSnapshot = {};
      state.isColdStart = true;
    }
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { Screening } from '../../megabox/dto/screening.dto';
import { BRCH_NO } from '../../megabox/megabox-schedule-fetcher.service';
import { buildMegaboxWebUrl } from '../utils/megabox-link-generator';
import { WatchStrategy } from './watch-strategy';

const STAGE_GREETING_EVENT_DIV_CD = 'MEK01';

@Injectable()
export class StageGreetingWatchStrategy implements WatchStrategy {
  readonly label = '무대인사';
  readonly chatId: string;
  readonly snapshotPath: string;

  constructor(configService: ConfigService) {
    this.chatId = configService.getOrThrow<string>(
      'TELEGRAM_CHAT_ID_STAGE_GREETING',
    );
    this.snapshotPath = resolve(
      process.cwd(),
      configService.getOrThrow<string>('STAGE_GREETING_SNAPSHOT_PATH'),
    );
  }

  filter(screenings: Screening[]): Screening[] {
    return screenings.filter(
      (s) => s.eventDivCd === STAGE_GREETING_EVENT_DIV_CD,
    );
  }

  buildBookingUrl(date: string): string {
    return buildMegaboxWebUrl({ brchNo: BRCH_NO, playDe: date });
  }
}

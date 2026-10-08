import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { Screening } from '../../megabox/dto/screening.dto';
import { BRCH_NO } from '../../megabox/megabox-schedule-fetcher.service';
import { buildMegaboxWebUrl } from '../utils/megabox-link-generator';
import { WatchStrategy } from './watch-strategy';

const GV_EVENT_DIV_CD = 'MEK06';

@Injectable()
export class GvWatchStrategy implements WatchStrategy {
  readonly label = 'GV';
  readonly chatId: string;
  readonly snapshotPath: string;

  constructor(configService: ConfigService) {
    this.chatId = configService.getOrThrow<string>('TELEGRAM_CHAT_ID_GV');
    this.snapshotPath = resolve(
      process.cwd(),
      configService.getOrThrow<string>('GV_SNAPSHOT_PATH'),
    );
  }

  filter(screenings: Screening[]): Screening[] {
    return screenings.filter((s) => s.eventDivCd === GV_EVENT_DIV_CD);
  }

  buildBookingUrl(date: string): string {
    return buildMegaboxWebUrl({ brchNo: BRCH_NO, playDe: date });
  }
}

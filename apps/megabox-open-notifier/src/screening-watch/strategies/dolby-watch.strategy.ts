import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { Screening } from '../../megabox/dto/screening.dto';
import { BRCH_NO } from '../../megabox/megabox-schedule-fetcher.service';
import { buildMegaboxWebUrl } from '../utils/megabox-link-generator';
import { WatchStrategy } from './watch-strategy';

const DOLBY_THEAB_KIND_CD = 'DBC';

@Injectable()
export class DolbyWatchStrategy implements WatchStrategy {
  readonly label = 'DOLBY CINEMA';
  readonly chatId: string;
  readonly snapshotPath: string;

  constructor(configService: ConfigService) {
    this.chatId = configService.getOrThrow<string>('TELEGRAM_CHAT_ID_DOLBY');
    this.snapshotPath = resolve(
      process.cwd(),
      configService.getOrThrow<string>('DOLBY_SNAPSHOT_PATH'),
    );
  }

  filter(screenings: Screening[]): Screening[] {
    return screenings.filter((s) => s.theabKindCd === DOLBY_THEAB_KIND_CD);
  }

  buildBookingUrl(date: string): string {
    return buildMegaboxWebUrl({ brchNo: BRCH_NO, playDe: date });
  }
}

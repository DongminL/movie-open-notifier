import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { Screening } from '../../cgv/dto/screening.dto';
import { WatchStrategy } from './watch-strategy';

const SCREENX_GRADE_CD = '04';

@Injectable()
export class ScreenXWatchStrategy implements WatchStrategy {
  readonly label = 'SCREENX';
  readonly chatId: string;
  readonly snapshotPath: string;

  constructor(configService: ConfigService) {
    this.chatId = configService.getOrThrow<string>('TELEGRAM_CHAT_ID_SCREENX');
    this.snapshotPath = resolve(
      process.cwd(),
      configService.getOrThrow<string>('SCREENX_SNAPSHOT_PATH'),
    );
  }

  filter(screenings: Screening[]): Screening[] {
    return screenings.filter((s) => s.tcscnsGradCd === SCREENX_GRADE_CD);
  }
}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { Screening } from '../../cgv/dto/screening.dto';
import { WatchStrategy } from './watch-strategy';

const IMAX_GRADE_CD = '03';

@Injectable()
export class ImaxWatchStrategy implements WatchStrategy {
  readonly label = 'IMAX';
  readonly chatId: string;
  readonly snapshotPath: string;

  constructor(configService: ConfigService) {
    this.chatId = configService.getOrThrow<string>('TELEGRAM_CHAT_ID_IMAX');
    this.snapshotPath = resolve(
      process.cwd(),
      configService.getOrThrow<string>('IMAX_SNAPSHOT_PATH'),
    );
  }

  filter(screenings: Screening[]): Screening[] {
    return screenings.filter((s) => s.tcscnsGradCd === IMAX_GRADE_CD);
  }
}

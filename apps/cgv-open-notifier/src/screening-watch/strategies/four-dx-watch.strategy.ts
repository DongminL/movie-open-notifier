import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { resolve } from 'path';
import { Screening } from '../../cgv/dto/screening.dto';
import { WatchStrategy } from './watch-strategy';

const FOURDX_GRADE_CD = '02';

@Injectable()
export class FourDxWatchStrategy implements WatchStrategy {
  readonly label = '4DX';
  readonly chatId: string;
  readonly snapshotPath: string;

  constructor(configService: ConfigService) {
    this.chatId = configService.getOrThrow<string>('TELEGRAM_CHAT_ID_4DX');
    this.snapshotPath = resolve(
      process.cwd(),
      configService.getOrThrow<string>('FOURDX_SNAPSHOT_PATH'),
    );
  }

  filter(screenings: Screening[]): Screening[] {
    return screenings.filter((s) => s.tcscnsGradCd === FOURDX_GRADE_CD);
  }
}

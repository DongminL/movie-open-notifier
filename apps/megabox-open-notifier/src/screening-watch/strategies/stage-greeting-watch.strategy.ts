import { ConfigService } from '@nestjs/config';
import { Branch } from '../../megabox/branches';
import { Screening } from '../../megabox/dto/screening.dto';
import { BranchWatchStrategy } from './watch-strategy';

const STAGE_GREETING_EVENT_DIV_CD = 'MEK01';

export class StageGreetingWatchStrategy extends BranchWatchStrategy {
  readonly label = '무대인사';

  constructor(configService: ConfigService, branch: Branch) {
    super(
      configService,
      branch,
      'TELEGRAM_CHAT_ID_STAGE_GREETING',
      'STAGE_GREETING_SNAPSHOT_PATH',
      'TELEGRAM_TOPIC_ID_STAGE_GREETING',
    );
  }

  filter(screenings: Screening[]): Screening[] {
    return this.inBranch(screenings).filter(
      (s) => s.eventDivCd === STAGE_GREETING_EVENT_DIV_CD,
    );
  }
}

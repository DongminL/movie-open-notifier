import { ConfigService } from '@nestjs/config';
import { Branch } from '../../megabox/branches';
import { Screening } from '../../megabox/dto/screening.dto';
import { BranchWatchStrategy } from './watch-strategy';

const GV_EVENT_DIV_CD = 'MEK06';

export class GvWatchStrategy extends BranchWatchStrategy {
  readonly label = 'GV';

  constructor(configService: ConfigService, branch: Branch) {
    super(
      configService,
      branch,
      'TELEGRAM_CHAT_ID_GV',
      'GV_SNAPSHOT_PATH',
      'TELEGRAM_TOPIC_ID_GV',
    );
  }

  filter(screenings: Screening[]): Screening[] {
    return this.inBranch(screenings).filter(
      (s) => s.eventDivCd === GV_EVENT_DIV_CD,
    );
  }
}

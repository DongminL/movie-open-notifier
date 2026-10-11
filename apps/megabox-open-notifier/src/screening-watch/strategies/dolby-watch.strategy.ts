import { ConfigService } from '@nestjs/config';
import { Branch } from '../../megabox/branches';
import { Screening } from '../../megabox/dto/screening.dto';
import { BranchWatchStrategy } from './watch-strategy';

const DOLBY_THEAB_KIND_CD = 'DBC';

export class DolbyWatchStrategy extends BranchWatchStrategy {
  readonly label = 'DOLBY CINEMA';

  constructor(configService: ConfigService, branch: Branch) {
    super(
      configService,
      branch,
      'TELEGRAM_CHAT_ID_DOLBY',
      'DOLBY_SNAPSHOT_PATH',
      'TELEGRAM_TOPIC_ID_DOLBY',
    );
  }

  filter(screenings: Screening[]): Screening[] {
    return this.inBranch(screenings).filter(
      (s) => s.theabKindCd === DOLBY_THEAB_KIND_CD,
    );
  }
}

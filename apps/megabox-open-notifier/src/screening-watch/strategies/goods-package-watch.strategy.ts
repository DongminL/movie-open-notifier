import { ConfigService } from '@nestjs/config';
import { Branch } from '../../megabox/branches';
import { Screening } from '../../megabox/dto/screening.dto';
import { BranchWatchStrategy } from './watch-strategy';

const GOODS_PACKAGE_EVENT_DIV_CD = 'MEK04';

export class GoodsPackageWatchStrategy extends BranchWatchStrategy {
  readonly label = '굿즈패키지';

  constructor(configService: ConfigService, branch: Branch) {
    super(
      configService,
      branch,
      'TELEGRAM_CHAT_ID_GOODS_PACKAGE',
      'GOODS_PACKAGE_SNAPSHOT_PATH',
      'TELEGRAM_TOPIC_ID_GOODS_PACKAGE',
    );
  }

  filter(screenings: Screening[]): Screening[] {
    return this.inBranch(screenings).filter(
      (s) => s.eventDivCd === GOODS_PACKAGE_EVENT_DIV_CD,
    );
  }
}

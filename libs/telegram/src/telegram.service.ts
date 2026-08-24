import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { getErrorStack } from '@app/common';

// 텔레그램 메시지 최대 길이는 4096자 — 여유를 두고 4000자에서 자름 (초과 시 400 Bad Request)
const MAX_MESSAGE_LENGTH = 4000;

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly chatId: string;

  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly configService: ConfigService,
  ) {
    this.chatId = this.configService.getOrThrow<string>('TELEGRAM_CHAT_ID');
  }

  async sendMessage(message: string): Promise<void> {
    const truncated =
      message.length > MAX_MESSAGE_LENGTH
        ? `${message.substring(0, MAX_MESSAGE_LENGTH)}\n\n...(생략)`
        : message;

    try {
      await this.bot.telegram.sendMessage(this.chatId, truncated, {
        parse_mode: 'Markdown',
      });
    } catch (error) {
      this.logger.error('Telegram 메시지 발송 실패', getErrorStack(error));
    }
  }
}

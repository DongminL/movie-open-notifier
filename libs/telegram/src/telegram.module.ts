import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.getOrThrow<string>('TELEGRAM_BOT_TOKEN'),
        // 현재 등록된 명령어가 없어 수신 폴링이 불필요 — 발송 전용으로만 사용
        launchOptions: false as const,
      }),
    }),
  ],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}

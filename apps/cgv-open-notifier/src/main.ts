import net from 'node:net';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Telegram Bot API 호출 시 발생할 수 있는 AggregateError 방지
net.setDefaultAutoSelectFamily(false);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks(); // PuppeteerBrowserService의 OnApplicationShutdown이 동작하려면 필요
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();

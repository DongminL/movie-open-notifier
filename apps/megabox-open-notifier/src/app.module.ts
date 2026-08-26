import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './config/validation.schema';
import { DolbyWatchModule } from './dolby-watch/dolby-watch.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/megabox-open-notifier/.env',
      validationSchema,
    }),
    DolbyWatchModule,
  ],
})
export class AppModule {}

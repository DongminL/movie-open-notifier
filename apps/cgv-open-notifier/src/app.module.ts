import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './config/validation.schema';
import { ScreeningWatchModule } from './screening-watch/screening-watch.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/cgv-open-notifier/.env',
      validationSchema,
    }),
    ScreeningWatchModule,
  ],
})
export class AppModule {}

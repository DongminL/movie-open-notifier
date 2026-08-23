import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './config/validation.schema';
import { ImaxWatchModule } from './imax-watch/imax-watch.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/cgv-open-notifier/.env',
      validationSchema,
    }),
    ImaxWatchModule,
  ],
})
export class AppModule {}

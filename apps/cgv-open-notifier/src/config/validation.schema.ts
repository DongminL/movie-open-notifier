import * as Joi from 'joi';

export const validationSchema = Joi.object({
  TELEGRAM_BOT_TOKEN: Joi.string().required(),
  TELEGRAM_CHAT_ID_IMAX: Joi.string().required(),
  // libs/telegram 기본 채팅방(오류 알림). IMAX 방으로 폴백
  TELEGRAM_CHAT_ID: Joi.string().default(Joi.ref('TELEGRAM_CHAT_ID_IMAX')),
  // 4DX 알림 채팅방. 미설정이면 TELEGRAM_CHAT_ID_IMAX로 폴백
  TELEGRAM_CHAT_ID_4DX: Joi.string().default(Joi.ref('TELEGRAM_CHAT_ID_IMAX')),
  // SCREENX 알림 채팅방. 미설정이면 TELEGRAM_CHAT_ID_IMAX로 폴백
  TELEGRAM_CHAT_ID_SCREENX: Joi.string().default(Joi.ref('TELEGRAM_CHAT_ID_IMAX'),),
  CGV_IMAX_URL: Joi.string()
    .uri()
    .default('https://cgv.co.kr/cnm/movieBook/cinema'),
  WATCH_HORIZON_DAYS: Joi.number().integer().min(1).default(25),
  WATCH_POLL_INTERVAL_SEC: Joi.number().integer().min(10).default(22),
  IMAX_SNAPSHOT_PATH: Joi.string().default('data/imax-snapshot.json'),
  FOURDX_SNAPSHOT_PATH: Joi.string().default('data/4dx-snapshot.json'),
  SCREENX_SNAPSHOT_PATH: Joi.string().default('data/screenx-snapshot.json'),
});

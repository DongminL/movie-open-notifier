import * as Joi from 'joi';

export const validationSchema = Joi.object({
  TELEGRAM_BOT_TOKEN: Joi.string().required(),
  // DOLBY CINEMA 알림 채팅방 (기본 채팅방)
  TELEGRAM_CHAT_ID_DOLBY: Joi.string().required(),
  // libs/telegram 기본 채팅방(오류 알림). DOLBY 방으로 폴백
  TELEGRAM_CHAT_ID: Joi.string().default(Joi.ref('TELEGRAM_CHAT_ID_DOLBY')),
  // 무대인사 알림 채팅방. 미설정이면 TELEGRAM_CHAT_ID_DOLBY로 폴백
  TELEGRAM_CHAT_ID_STAGE_GREETING: Joi.string().default(
    Joi.ref('TELEGRAM_CHAT_ID_DOLBY'),
  ),
  // GV 알림 채팅방. 미설정이면 TELEGRAM_CHAT_ID_DOLBY로 폴백
  TELEGRAM_CHAT_ID_GV: Joi.string().default(Joi.ref('TELEGRAM_CHAT_ID_DOLBY')),
  MEGABOX_SCHEDULE_URL: Joi.string()
    .uri()
    .default('https://www.megabox.co.kr/on/oh/ohc/Brch/schedulePage.do'),
  WATCH_HORIZON_DAYS: Joi.number().integer().min(1).default(25),
  WATCH_POLL_INTERVAL_SEC: Joi.number().integer().min(10).default(22),
  DOLBY_SNAPSHOT_PATH: Joi.string().default('data/dolby-snapshot.json'),
  STAGE_GREETING_SNAPSHOT_PATH: Joi.string().default(
    'data/stage-greeting-snapshot.json',
  ),
  GV_SNAPSHOT_PATH: Joi.string().default('data/gv-snapshot.json'),
});

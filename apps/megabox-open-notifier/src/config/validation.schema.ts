import * as Joi from 'joi';

export const validationSchema = Joi.object({
  TELEGRAM_BOT_TOKEN: Joi.string().required(),
  TELEGRAM_CHAT_ID: Joi.string().required(),
  MEGABOX_SCHEDULE_URL: Joi.string()
    .uri()
    .default('https://www.megabox.co.kr/on/oh/ohc/Brch/schedulePage.do'),
  WATCH_HORIZON_DAYS: Joi.number().integer().min(1).default(25),
  WATCH_POLL_INTERVAL_SEC: Joi.number().integer().min(10).default(22),
  DOLBY_SNAPSHOT_PATH: Joi.string().default('data/dolby-snapshot.json'),
});

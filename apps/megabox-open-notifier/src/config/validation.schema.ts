import * as Joi from 'joi';
import { WATCH_BRANCHES } from '../megabox/branches';

const TOPIC_ID_PREFIXES = [
  'TELEGRAM_TOPIC_ID_DOLBY',
  'TELEGRAM_TOPIC_ID_STAGE_GREETING',
  'TELEGRAM_TOPIC_ID_GV',
];

const topicIdSchemas = Object.fromEntries(
  TOPIC_ID_PREFIXES.flatMap((prefix) =>
    WATCH_BRANCHES.map(({ brchNo }) => [
      `${prefix}_${brchNo}`,
      // .env에 `KEY=`처럼 빈 값으로 둔 경우도 미설정으로 취급
      Joi.number().integer().positive().empty(''),
    ]),
  ),
);

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
  // 상영 유형 × 지점별 텔레그램 토픽(TELEGRAM_TOPIC_ID_{DOLBY|STAGE_GREETING|GV}_{brchNo}).
  // 미설정이면 토픽 없이 채팅방 기본 위치로 전송
  ...topicIdSchemas,
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

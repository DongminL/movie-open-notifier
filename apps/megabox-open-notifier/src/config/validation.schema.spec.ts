import { validationSchema } from './validation.schema';

describe('validationSchema', () => {
  const base = { TELEGRAM_BOT_TOKEN: 'token', TELEGRAM_CHAT_ID_DOLBY: '-100' };

  it('falls back to the Dolby chat when the stage greeting and GV chats are unset', () => {
    const { value, error } = validationSchema.validate(base) as {
      value: Record<string, unknown>;
      error?: Error;
    };

    expect(error).toBeUndefined();
    expect(value.TELEGRAM_CHAT_ID_STAGE_GREETING).toBe('-100');
    expect(value.TELEGRAM_CHAT_ID_GV).toBe('-100');
  });

  it('keeps separately configured stage greeting and GV chats', () => {
    const { value } = validationSchema.validate({
      ...base,
      TELEGRAM_CHAT_ID_STAGE_GREETING: '-200',
      TELEGRAM_CHAT_ID_GV: '-300',
    }) as { value: Record<string, unknown> };

    expect(value.TELEGRAM_CHAT_ID_STAGE_GREETING).toBe('-200');
    expect(value.TELEGRAM_CHAT_ID_GV).toBe('-300');
  });

  it('treats blank topic ids as unset instead of failing validation', () => {
    const { value, error } = validationSchema.validate({
      ...base,
      TELEGRAM_TOPIC_ID_GV_1212: '',
    }) as { value: Record<string, unknown>; error?: Error };

    expect(error).toBeUndefined();
    expect(value.TELEGRAM_TOPIC_ID_GV_1212).toBeUndefined();
  });

  it('accepts topic ids per type and branch as numbers and leaves them optional', () => {
    const { value, error } = validationSchema.validate({
      ...base,
      TELEGRAM_TOPIC_ID_DOLBY_1351: '11',
      TELEGRAM_TOPIC_ID_GV_1212: '22',
    }) as { value: Record<string, unknown>; error?: Error };

    expect(error).toBeUndefined();
    expect(value.TELEGRAM_TOPIC_ID_DOLBY_1351).toBe(11);
    expect(value.TELEGRAM_TOPIC_ID_GV_1212).toBe(22);
    expect(value.TELEGRAM_TOPIC_ID_STAGE_GREETING_0019).toBeUndefined();
  });
});

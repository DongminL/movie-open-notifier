import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getBotToken } from 'nestjs-telegraf';
import { TelegramService } from './telegram.service';

describe('TelegramService', () => {
  let service: TelegramService;
  const sendMessage = jest.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    sendMessage.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        {
          provide: getBotToken(),
          useValue: { telegram: { sendMessage } },
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'test-chat-id' },
        },
      ],
    }).compile();

    service = module.get(TelegramService);
  });

  it('sends the message as-is when under the length limit', async () => {
    await service.sendMessage('짧은 메시지');

    expect(sendMessage).toHaveBeenCalledWith('test-chat-id', '짧은 메시지', {
      parse_mode: 'Markdown',
    });
  });

  it('truncates messages longer than 4000 characters', async () => {
    const longMessage = 'a'.repeat(4100);

    await service.sendMessage(longMessage);

    const [, sentText] = sendMessage.mock.calls[0] as [string, string];
    expect(sentText.length).toBe(4000 + '\n\n...(생략)'.length);
    expect(sentText.endsWith('...(생략)')).toBe(true);
  });

  it('swallows send failures instead of throwing', async () => {
    sendMessage.mockRejectedValueOnce(new Error('network error'));

    await expect(service.sendMessage('메시지')).resolves.toBeUndefined();
  });
});

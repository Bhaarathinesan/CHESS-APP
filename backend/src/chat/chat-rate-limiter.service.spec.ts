import { Test, TestingModule } from '@nestjs/testing';
import { ChatRateLimiterService } from './chat-rate-limiter.service';
import { RedisService } from '../redis/redis.service';

describe('ChatRateLimiterService', () => {
  let service: ChatRateLimiterService;
  let redisService: RedisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatRateLimiterService,
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue(null), // Use memory store for tests
          },
        },
      ],
    }).compile();

    service = module.get<ChatRateLimiterService>(ChatRateLimiterService);
    redisService = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('canSendMessage', () => {
    it('should allow first message', async () => {
      const canSend = await service.canSendMessage('user1', 'game1');
      expect(canSend).toBe(true);
    });

    it('should allow up to 5 messages', async () => {
      const userId = 'user2';
      const gameId = 'game2';

      for (let i = 0; i < 5; i++) {
        const canSend = await service.canSendMessage(userId, gameId);
        expect(canSend).toBe(true);
      }
    });

    it('should block 6th message within window', async () => {
      const userId = 'user3';
      const gameId = 'game3';

      // Send 5 messages
      for (let i = 0; i < 5; i++) {
        await service.canSendMessage(userId, gameId);
      }

      // 6th message should be blocked
      const canSend = await service.canSendMessage(userId, gameId);
      expect(canSend).toBe(false);
    });

    it('should track different users separately', async () => {
      const gameId = 'game4';

      // User 1 sends 5 messages
      for (let i = 0; i < 5; i++) {
        await service.canSendMessage('user4a', gameId);
      }

      // User 2 should still be able to send
      const canSend = await service.canSendMessage('user4b', gameId);
      expect(canSend).toBe(true);
    });

    it('should track different games separately', async () => {
      const userId = 'user5';

      // Send 5 messages in game1
      for (let i = 0; i < 5; i++) {
        await service.canSendMessage(userId, 'game5a');
      }

      // Should still be able to send in game2
      const canSend = await service.canSendMessage(userId, 'game5b');
      expect(canSend).toBe(true);
    });
  });

  describe('getRemainingMessages', () => {
    it('should return 5 for new user', async () => {
      const remaining = await service.getRemainingMessages('user6', 'game6');
      expect(remaining).toBe(5);
    });

    it('should decrease after sending messages', async () => {
      const userId = 'user7';
      const gameId = 'game7';

      await service.canSendMessage(userId, gameId);
      await service.canSendMessage(userId, gameId);

      const remaining = await service.getRemainingMessages(userId, gameId);
      expect(remaining).toBe(3);
    });

    it('should return 0 when rate limited', async () => {
      const userId = 'user8';
      const gameId = 'game8';

      // Send 5 messages
      for (let i = 0; i < 5; i++) {
        await service.canSendMessage(userId, gameId);
      }

      const remaining = await service.getRemainingMessages(userId, gameId);
      expect(remaining).toBe(0);
    });
  });

  describe('getResetTime', () => {
    it('should return 0 for new user', async () => {
      const resetTime = await service.getResetTime('user9', 'game9');
      expect(resetTime).toBe(0);
    });

    it('should return time until reset when rate limited', async () => {
      const userId = 'user10';
      const gameId = 'game10';

      // Send 5 messages
      for (let i = 0; i < 5; i++) {
        await service.canSendMessage(userId, gameId);
      }

      const resetTime = await service.getResetTime(userId, gameId);
      expect(resetTime).toBeGreaterThan(0);
      expect(resetTime).toBeLessThanOrEqual(60000); // Should be <= 60 seconds
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { MatchmakingController } from './matchmaking.controller';
import { MatchmakingService, QueueStatus } from './matchmaking.service';
import { TimeControl } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('MatchmakingController', () => {
  let controller: MatchmakingController;
  let service: MatchmakingService;

  const mockQueueStatus: QueueStatus = {
    position: 1,
    waitTimeSeconds: 5,
    queueSize: 3,
  };

  const mockMatchmakingService = {
    joinQueue: jest.fn(),
    leaveQueue: jest.fn(),
    getQueueStatus: jest.fn(),
    getUserQueue: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchmakingController],
      providers: [
        {
          provide: MatchmakingService,
          useValue: mockMatchmakingService,
        },
      ],
    }).compile();

    controller = module.get<MatchmakingController>(MatchmakingController);
    service = module.get<MatchmakingService>(MatchmakingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('joinQueue', () => {
    it('should join queue with valid parameters', async () => {
      const userId = 'user-123';
      const dto = {
        timeControl: TimeControl.BLITZ,
        ratingRange: 200,
      };

      mockMatchmakingService.joinQueue.mockResolvedValue(mockQueueStatus);

      const result = await controller.joinQueue(userId, dto);

      expect(result).toEqual(mockQueueStatus);
      expect(service.joinQueue).toHaveBeenCalledWith(
        userId,
        TimeControl.BLITZ,
        200,
      );
    });

    it('should use default rating range if not provided', async () => {
      const userId = 'user-123';
      const dto = {
        timeControl: TimeControl.RAPID,
      };

      mockMatchmakingService.joinQueue.mockResolvedValue(mockQueueStatus);

      await controller.joinQueue(userId, dto);

      expect(service.joinQueue).toHaveBeenCalledWith(
        userId,
        TimeControl.RAPID,
        undefined,
      );
    });

    it('should throw error if user already in queue', async () => {
      const userId = 'user-123';
      const dto = {
        timeControl: TimeControl.BULLET,
        ratingRange: 150,
      };

      mockMatchmakingService.joinQueue.mockRejectedValue(
        new BadRequestException('User is already in BLITZ queue'),
      );

      await expect(controller.joinQueue(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('leaveQueue', () => {
    it('should successfully leave queue', async () => {
      const userId = 'user-123';

      mockMatchmakingService.leaveQueue.mockResolvedValue(true);

      const result = await controller.leaveQueue(userId);

      expect(result).toEqual({ success: true });
      expect(service.leaveQueue).toHaveBeenCalledWith(userId);
    });

    it('should return false if user not in queue', async () => {
      const userId = 'user-456';

      mockMatchmakingService.leaveQueue.mockResolvedValue(false);

      const result = await controller.leaveQueue(userId);

      expect(result).toEqual({ success: false });
      expect(service.leaveQueue).toHaveBeenCalledWith(userId);
    });
  });

  describe('getStatus', () => {
    it('should return queue status for user in queue', async () => {
      const userId = 'user-123';

      mockMatchmakingService.getUserQueue.mockResolvedValue(TimeControl.BLITZ);
      mockMatchmakingService.getQueueStatus.mockResolvedValue(mockQueueStatus);

      const result = await controller.getStatus(userId);

      expect(result).toEqual(mockQueueStatus);
      expect(service.getUserQueue).toHaveBeenCalledWith(userId);
      expect(service.getQueueStatus).toHaveBeenCalledWith(
        userId,
        TimeControl.BLITZ,
      );
    });

    it('should return empty status if user not in queue', async () => {
      const userId = 'user-456';

      mockMatchmakingService.getUserQueue.mockResolvedValue(null);

      const result = await controller.getStatus(userId);

      expect(result).toEqual({
        position: 0,
        waitTimeSeconds: 0,
        queueSize: 0,
      });
      expect(service.getUserQueue).toHaveBeenCalledWith(userId);
      expect(service.getQueueStatus).not.toHaveBeenCalled();
    });
  });
});

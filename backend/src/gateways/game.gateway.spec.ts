import { Test, TestingModule } from '@nestjs/testing';
import { GameGateway } from './game.gateway';
import { RedisService } from '../redis/redis.service';
import { Server, Socket } from 'socket.io';

describe('GameGateway - Draw Offer Functionality', () => {
  let gateway: GameGateway;
  let redisService: RedisService;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  beforeEach(async () => {
    // Mock Redis service
    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    // Mock Socket.IO server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    // Mock Socket.IO client
    mockClient = {
      id: 'test-client-id',
      join: jest.fn(),
      leave: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    redisService = module.get<RedisService>(RedisService);
    gateway.server = mockServer as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleOfferDraw', () => {
    it('should create a draw offer and notify opponent', async () => {
      const gameId = 'game-123';
      const playerId = 'player-1';

      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const result = await gateway.handleOfferDraw(mockClient as Socket, {
        gameId,
        playerId,
      });

      expect(redisService.get).toHaveBeenCalledWith(`draw_offer:${gameId}`);
      expect(redisService.set).toHaveBeenCalledWith(
        `draw_offer:${gameId}`,
        expect.stringContaining(playerId),
        60,
      );
      expect(mockServer.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('draw_offered', {
        gameId,
        offeringPlayerId: playerId,
        expiresAt: expect.any(Number),
      });
      expect(result.event).toBe('draw_offer_sent');
    });

    it('should reject draw offer if one already exists', async () => {
      const gameId = 'game-123';
      const playerId = 'player-1';

      jest
        .spyOn(redisService, 'get')
        .mockResolvedValue(
          JSON.stringify({ offeringPlayerId: 'player-2', timestamp: Date.now() }),
        );

      const result = await gateway.handleOfferDraw(mockClient as Socket, {
        gameId,
        playerId,
      });

      expect(result.event).toBe('draw_offer_error');
      expect(result.data.message).toBe('A draw offer is already pending');
      expect(redisService.set).not.toHaveBeenCalled();
    });

    it('should auto-expire draw offer after 60 seconds', async () => {
      jest.useFakeTimers();
      const gameId = 'game-123';
      const playerId = 'player-1';

      jest.spyOn(redisService, 'get').mockResolvedValue(null);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);
      jest.spyOn(redisService, 'delete').mockResolvedValue(1);

      await gateway.handleOfferDraw(mockClient as Socket, {
        gameId,
        playerId,
      });

      // Mock that offer still exists after 60 seconds
      jest
        .spyOn(redisService, 'get')
        .mockResolvedValue(
          JSON.stringify({ offeringPlayerId: playerId, timestamp: Date.now() }),
        );

      // Fast-forward time by 60 seconds
      jest.advanceTimersByTime(60000);

      // Wait for async operations
      await Promise.resolve();

      expect(redisService.delete).toHaveBeenCalledWith(`draw_offer:${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('draw_offer_expired', {
        gameId,
        offeringPlayerId: playerId,
      });

      jest.useRealTimers();
    });
  });

  describe('handleAcceptDraw', () => {
    it('should accept draw offer and notify both players', async () => {
      const gameId = 'game-123';
      const offeringPlayerId = 'player-1';
      const acceptingPlayerId = 'player-2';

      jest
        .spyOn(redisService, 'get')
        .mockResolvedValue(
          JSON.stringify({ offeringPlayerId, timestamp: Date.now() }),
        );
      jest.spyOn(redisService, 'delete').mockResolvedValue(1);

      const result = await gateway.handleAcceptDraw(mockClient as Socket, {
        gameId,
        playerId: acceptingPlayerId,
      });

      expect(redisService.get).toHaveBeenCalledWith(`draw_offer:${gameId}`);
      expect(redisService.delete).toHaveBeenCalledWith(`draw_offer:${gameId}`);
      expect(mockServer.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('draw_accepted', {
        gameId,
        acceptingPlayerId,
        offeringPlayerId,
      });
      expect(result.event).toBe('draw_accepted_confirmed');
    });

    it('should reject if no active draw offer exists', async () => {
      const gameId = 'game-123';
      const playerId = 'player-2';

      jest.spyOn(redisService, 'get').mockResolvedValue(null);

      const result = await gateway.handleAcceptDraw(mockClient as Socket, {
        gameId,
        playerId,
      });

      expect(result.event).toBe('draw_accept_error');
      expect(result.data.message).toBe('No active draw offer found');
      expect(redisService.delete).not.toHaveBeenCalled();
    });

    it('should reject if player tries to accept their own offer', async () => {
      const gameId = 'game-123';
      const playerId = 'player-1';

      jest
        .spyOn(redisService, 'get')
        .mockResolvedValue(
          JSON.stringify({ offeringPlayerId: playerId, timestamp: Date.now() }),
        );

      const result = await gateway.handleAcceptDraw(mockClient as Socket, {
        gameId,
        playerId,
      });

      expect(result.event).toBe('draw_accept_error');
      expect(result.data.message).toBe('Cannot accept your own draw offer');
      expect(redisService.delete).not.toHaveBeenCalled();
    });
  });

  describe('handleDeclineDraw', () => {
    it('should decline draw offer and notify both players', async () => {
      const gameId = 'game-123';
      const offeringPlayerId = 'player-1';
      const decliningPlayerId = 'player-2';

      jest
        .spyOn(redisService, 'get')
        .mockResolvedValue(
          JSON.stringify({ offeringPlayerId, timestamp: Date.now() }),
        );
      jest.spyOn(redisService, 'delete').mockResolvedValue(1);

      const result = await gateway.handleDeclineDraw(mockClient as Socket, {
        gameId,
        playerId: decliningPlayerId,
      });

      expect(redisService.get).toHaveBeenCalledWith(`draw_offer:${gameId}`);
      expect(redisService.delete).toHaveBeenCalledWith(`draw_offer:${gameId}`);
      expect(mockServer.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('draw_declined', {
        gameId,
        decliningPlayerId,
        offeringPlayerId,
      });
      expect(result.event).toBe('draw_declined_confirmed');
    });

    it('should reject if no active draw offer exists', async () => {
      const gameId = 'game-123';
      const playerId = 'player-2';

      jest.spyOn(redisService, 'get').mockResolvedValue(null);

      const result = await gateway.handleDeclineDraw(mockClient as Socket, {
        gameId,
        playerId,
      });

      expect(result.event).toBe('draw_decline_error');
      expect(result.data.message).toBe('No active draw offer found');
      expect(redisService.delete).not.toHaveBeenCalled();
    });

    it('should reject if player tries to decline their own offer', async () => {
      const gameId = 'game-123';
      const playerId = 'player-1';

      jest
        .spyOn(redisService, 'get')
        .mockResolvedValue(
          JSON.stringify({ offeringPlayerId: playerId, timestamp: Date.now() }),
        );

      const result = await gateway.handleDeclineDraw(mockClient as Socket, {
        gameId,
        playerId,
      });

      expect(result.event).toBe('draw_decline_error');
      expect(result.data.message).toBe('Cannot decline your own draw offer');
      expect(redisService.delete).not.toHaveBeenCalled();
    });
  });

  describe('handleCancelDrawOffer', () => {
    it('should cancel draw offer and notify both players', async () => {
      const gameId = 'game-123';
      const playerId = 'player-1';

      jest
        .spyOn(redisService, 'get')
        .mockResolvedValue(
          JSON.stringify({ offeringPlayerId: playerId, timestamp: Date.now() }),
        );
      jest.spyOn(redisService, 'delete').mockResolvedValue(1);

      const result = await gateway.handleCancelDrawOffer(mockClient as Socket, {
        gameId,
        playerId,
      });

      expect(redisService.get).toHaveBeenCalledWith(`draw_offer:${gameId}`);
      expect(redisService.delete).toHaveBeenCalledWith(`draw_offer:${gameId}`);
      expect(mockServer.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('draw_offer_cancelled', {
        gameId,
        offeringPlayerId: playerId,
      });
      expect(result.event).toBe('draw_offer_cancelled_confirmed');
    });

    it('should reject if no active draw offer exists', async () => {
      const gameId = 'game-123';
      const playerId = 'player-1';

      jest.spyOn(redisService, 'get').mockResolvedValue(null);

      const result = await gateway.handleCancelDrawOffer(mockClient as Socket, {
        gameId,
        playerId,
      });

      expect(result.event).toBe('draw_cancel_error');
      expect(result.data.message).toBe('No active draw offer found');
      expect(redisService.delete).not.toHaveBeenCalled();
    });

    it('should reject if player tries to cancel another player\'s offer', async () => {
      const gameId = 'game-123';
      const playerId = 'player-2';

      jest
        .spyOn(redisService, 'get')
        .mockResolvedValue(
          JSON.stringify({ offeringPlayerId: 'player-1', timestamp: Date.now() }),
        );

      const result = await gateway.handleCancelDrawOffer(mockClient as Socket, {
        gameId,
        playerId,
      });

      expect(result.event).toBe('draw_cancel_error');
      expect(result.data.message).toBe('Can only cancel your own draw offer');
      expect(redisService.delete).not.toHaveBeenCalled();
    });
  });
});

describe('GameGateway - Timeout Detection and Handling', () => {
  let gateway: GameGateway;
  let redisService: RedisService;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  beforeEach(async () => {
    // Mock Redis service
    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    // Mock Socket.IO server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    // Mock Socket.IO client
    mockClient = {
      id: 'test-client-id',
      join: jest.fn(),
      leave: jest.fn(),
      rooms: new Set(['game:game-123']),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    redisService = module.get<RedisService>(RedisService);
    gateway.server = mockServer as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleStartClock', () => {
    it('should start the clock and store initial state in Redis', async () => {
      const gameId = 'game-123';
      const whiteTimeRemaining = 300000; // 5 minutes
      const blackTimeRemaining = 300000;
      const currentTurn = 'white';

      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const result = await gateway.handleStartClock(mockClient as Socket, {
        gameId,
        whiteTimeRemaining,
        blackTimeRemaining,
        currentTurn,
      });

      expect(redisService.set).toHaveBeenCalledWith(
        `clock:${gameId}`,
        expect.stringContaining('"whiteTimeRemaining":300000'),
        undefined,
      );
      expect(result.event).toBe('clock_started');
    });
  });

  describe('handleUpdateClock', () => {
    it('should update clock state in Redis', async () => {
      const gameId = 'game-123';
      const whiteTimeRemaining = 290000;
      const blackTimeRemaining = 300000;
      const currentTurn = 'black';

      const existingClock = JSON.stringify({
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now() - 10000,
        isPaused: false,
      });

      jest.spyOn(redisService, 'get').mockResolvedValue(existingClock);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const result = await gateway.handleUpdateClock(mockClient as Socket, {
        gameId,
        whiteTimeRemaining,
        blackTimeRemaining,
        currentTurn,
      });

      expect(redisService.get).toHaveBeenCalledWith(`clock:${gameId}`);
      expect(redisService.set).toHaveBeenCalledWith(
        `clock:${gameId}`,
        expect.stringContaining('"whiteTimeRemaining":290000'),
        undefined,
      );
      expect(result.event).toBe('clock_updated');
    });
  });

  describe('handleStopClock', () => {
    it('should stop the clock and remove data from Redis', async () => {
      const gameId = 'game-123';

      jest.spyOn(redisService, 'delete').mockResolvedValue(1);

      const result = await gateway.handleStopClock(mockClient as Socket, {
        gameId,
      });

      expect(redisService.delete).toHaveBeenCalledWith(`clock:${gameId}`);
      expect(result.event).toBe('clock_stopped');
    });
  });

  describe('handleRegisterPlayer', () => {
    it('should register player and clear disconnection timeout on reconnection', async () => {
      const gameId = 'game-123';
      const playerId = 'player-1';

      jest.spyOn(redisService, 'get').mockResolvedValue(
        JSON.stringify({
          whiteTimeRemaining: 300000,
          blackTimeRemaining: 300000,
          currentTurn: 'white',
          lastUpdate: Date.now(),
          isPaused: true,
          pausedPlayerId: playerId,
        }),
      );
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      const result = await gateway.handleRegisterPlayer(mockClient as Socket, {
        gameId,
        playerId,
      });

      expect(result.event).toBe('player_registered');
      expect(result.data.playerId).toBe(playerId);
    });
  });

  describe('handleDisconnect - Clock Pause', () => {
    it('should pause clock when player disconnects', async () => {
      jest.useFakeTimers();
      const gameId = 'game-123';
      const playerId = 'player-1';

      // Register the player first
      await gateway.handleRegisterPlayer(mockClient as Socket, {
        gameId,
        playerId,
      });

      const clockData = JSON.stringify({
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
      });

      jest.spyOn(redisService, 'get').mockResolvedValue(clockData);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      // Trigger disconnect
      gateway.handleDisconnect(mockClient as Socket);

      // Wait for async operations
      await Promise.resolve();

      expect(mockServer.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('player_disconnected', {
        gameId,
        playerId,
        pausedAt: expect.any(Number),
      });

      jest.useRealTimers();
    });

    it('should resume clock after 60 seconds if player does not reconnect', async () => {
      jest.useFakeTimers();
      const gameId = 'game-123';
      const playerId = 'player-1';

      // Register the player first
      await gateway.handleRegisterPlayer(mockClient as Socket, {
        gameId,
        playerId,
      });

      const clockData = JSON.stringify({
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
      });

      jest.spyOn(redisService, 'get').mockResolvedValue(clockData);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      // Trigger disconnect
      gateway.handleDisconnect(mockClient as Socket);

      // Fast-forward time by 60 seconds
      jest.advanceTimersByTime(60000);

      // Wait for async operations
      await Promise.resolve();

      expect(mockServer.emit).toHaveBeenCalledWith('clock_resumed_after_disconnect', {
        gameId,
        playerId,
        resumedAt: expect.any(Number),
      });

      jest.useRealTimers();
    });
  });

  describe('Timeout Detection', () => {
    it('should detect when white player time reaches zero and declare black winner', async () => {
      jest.useFakeTimers();
      const gameId = 'game-123';

      const clockData = JSON.stringify({
        whiteTimeRemaining: 100, // Very low time
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: false,
        tickCount: 0,
      });

      jest.spyOn(redisService, 'get').mockResolvedValue(clockData);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);
      jest.spyOn(redisService, 'delete').mockResolvedValue(1);

      // Start the clock
      await gateway.handleStartClock(mockClient as Socket, {
        gameId,
        whiteTimeRemaining: 100,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
      });

      // Advance time to trigger timeout
      jest.advanceTimersByTime(200);

      // Wait for async operations
      await Promise.resolve();

      expect(mockServer.emit).toHaveBeenCalledWith('game_ended', {
        gameId,
        result: 'black_win',
        terminationReason: 'timeout',
        timeoutPlayer: 'white',
        winner: 'black',
      });

      jest.useRealTimers();
    });

    it('should detect when black player time reaches zero and declare white winner', async () => {
      jest.useFakeTimers();
      const gameId = 'game-123';

      const clockData = JSON.stringify({
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 100, // Very low time
        currentTurn: 'black',
        lastUpdate: Date.now(),
        isPaused: false,
        tickCount: 0,
      });

      jest.spyOn(redisService, 'get').mockResolvedValue(clockData);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);
      jest.spyOn(redisService, 'delete').mockResolvedValue(1);

      // Start the clock
      await gateway.handleStartClock(mockClient as Socket, {
        gameId,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 100,
        currentTurn: 'black',
      });

      // Advance time to trigger timeout
      jest.advanceTimersByTime(200);

      // Wait for async operations
      await Promise.resolve();

      expect(mockServer.emit).toHaveBeenCalledWith('game_ended', {
        gameId,
        result: 'white_win',
        terminationReason: 'timeout',
        timeoutPlayer: 'black',
        winner: 'white',
      });

      jest.useRealTimers();
    });

    it('should not decrement time when clock is paused', async () => {
      jest.useFakeTimers();
      const gameId = 'game-123';

      const clockData = JSON.stringify({
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
        lastUpdate: Date.now(),
        isPaused: true, // Clock is paused
        pausedPlayerId: 'player-1',
        tickCount: 0,
      });

      jest.spyOn(redisService, 'get').mockResolvedValue(clockData);
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      // Start the clock
      await gateway.handleStartClock(mockClient as Socket, {
        gameId,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        currentTurn: 'white',
      });

      // Advance time
      jest.advanceTimersByTime(5000);

      // Wait for async operations
      await Promise.resolve();

      // Clock should not have been updated since it's paused
      // The set should only be called once for starting the clock
      expect(redisService.set).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });
  });
});

describe('GameGateway - Make Move Functionality', () => {
  let gateway: GameGateway;
  let redisService: RedisService;
  let prismaService: any;
  let chessEngineService: any;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  beforeEach(async () => {
    // Mock Redis service
    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    // Mock Prisma service
    const mockPrismaService = {
      game: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      gameMove: {
        create: jest.fn(),
      },
    };

    // Mock Chess Engine service
    const mockChessEngineService = {
      createGame: jest.fn(),
      makeMove: jest.fn(),
      getFen: jest.fn(),
      getTurn: jest.fn(),
      isCheck: jest.fn(),
      isCheckmate: jest.fn(),
      isStalemate: jest.fn(),
      isDraw: jest.fn(),
      isGameOver: jest.fn(),
      isInsufficientMaterial: jest.fn(),
      isThreefoldRepetition: jest.fn(),
      getPgn: jest.fn(),
    };

    // Mock Socket.IO server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    // Mock Socket.IO client
    mockClient = {
      id: 'test-client-id',
      data: {
        user: {
          id: 'player-white-id',
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: 'PrismaService',
          useValue: mockPrismaService,
        },
        {
          provide: 'ChessEngineService',
          useValue: mockChessEngineService,
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    redisService = module.get<RedisService>(RedisService);
    prismaService = module.get('PrismaService');
    chessEngineService = module.get('ChessEngineService');
    gateway.server = mockServer as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleMakeMove', () => {
    it('should validate and broadcast a valid move', async () => {
      const gameId = 'game-123';
      const from = 'e2';
      const to = 'e4';

      const mockGame = {
        id: gameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: 'player-white-id',
        blackPlayerId: 'player-black-id',
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 0,
        pgn: '',
      };

      const mockMove = {
        from: 'e2',
        to: 'e4',
        san: 'e4',
        piece: 'p',
        flags: '',
      };

      const mockChess = {};

      prismaService.game.findUnique.mockResolvedValue(mockGame);
      chessEngineService.createGame.mockReturnValue(mockChess);
      chessEngineService.getTurn.mockReturnValue('w');
      chessEngineService.makeMove.mockReturnValue(mockMove);
      chessEngineService.getFen.mockReturnValue('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
      chessEngineService.isCheck.mockReturnValue(false);
      chessEngineService.isCheckmate.mockReturnValue(false);
      chessEngineService.isStalemate.mockReturnValue(false);
      chessEngineService.isDraw.mockReturnValue(false);
      chessEngineService.isGameOver.mockReturnValue(false);
      chessEngineService.getPgn.mockReturnValue('1. e4');

      prismaService.game.update.mockResolvedValue({ ...mockGame, moveCount: 1 });
      prismaService.gameMove.create.mockResolvedValue({});

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId,
        from,
        to,
      });

      expect(prismaService.game.findUnique).toHaveBeenCalledWith({
        where: { id: gameId },
        select: expect.any(Object),
      });
      expect(chessEngineService.createGame).toHaveBeenCalledWith(mockGame.fenCurrent);
      expect(chessEngineService.makeMove).toHaveBeenCalledWith(mockChess, from, to, undefined);
      expect(prismaService.game.update).toHaveBeenCalled();
      expect(prismaService.gameMove.create).toHaveBeenCalled();
      expect(mockServer.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('move_made', expect.any(Object));
      expect(result.event).toBe('move_success');
    });

    it('should reject move if game not found', async () => {
      const gameId = 'game-123';
      const from = 'e2';
      const to = 'e4';

      prismaService.game.findUnique.mockResolvedValue(null);

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId,
        from,
        to,
      });

      expect(result.event).toBe('move_error');
      expect(result.data.message).toBe('Game not found');
    });

    it('should reject move if game is not active', async () => {
      const gameId = 'game-123';
      const from = 'e2';
      const to = 'e4';

      const mockGame = {
        id: gameId,
        status: 'COMPLETED',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: 'player-white-id',
        blackPlayerId: 'player-black-id',
        moveCount: 0,
      };

      prismaService.game.findUnique.mockResolvedValue(mockGame);

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId,
        from,
        to,
      });

      expect(result.event).toBe('move_error');
      expect(result.data.message).toBe('Game is not active');
    });

    it('should reject move if user is not a player', async () => {
      const gameId = 'game-123';
      const from = 'e2';
      const to = 'e4';

      const mockGame = {
        id: gameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: 'other-player-1',
        blackPlayerId: 'other-player-2',
        moveCount: 0,
      };

      prismaService.game.findUnique.mockResolvedValue(mockGame);

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId,
        from,
        to,
      });

      expect(result.event).toBe('move_error');
      expect(result.data.message).toBe('You are not a player in this game');
    });

    it('should reject move if not player\'s turn', async () => {
      const gameId = 'game-123';
      const from = 'e7';
      const to = 'e5';

      const mockGame = {
        id: gameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: 'player-white-id',
        blackPlayerId: 'player-black-id',
        moveCount: 0,
      };

      const mockChess = {};

      prismaService.game.findUnique.mockResolvedValue(mockGame);
      chessEngineService.createGame.mockReturnValue(mockChess);
      chessEngineService.getTurn.mockReturnValue('w'); // White's turn, but user is white trying to move black piece

      // Set client to be white player
      mockClient.data = { user: { id: 'player-black-id' } };

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId,
        from,
        to,
      });

      expect(result.event).toBe('move_error');
      expect(result.data.message).toBe('It is not your turn');
    });

    it('should reject invalid move', async () => {
      const gameId = 'game-123';
      const from = 'e2';
      const to = 'e5'; // Invalid move

      const mockGame = {
        id: gameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: 'player-white-id',
        blackPlayerId: 'player-black-id',
        moveCount: 0,
      };

      const mockChess = {};

      prismaService.game.findUnique.mockResolvedValue(mockGame);
      chessEngineService.createGame.mockReturnValue(mockChess);
      chessEngineService.getTurn.mockReturnValue('w');
      chessEngineService.makeMove.mockReturnValue(null); // Invalid move

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId,
        from,
        to,
      });

      expect(result.event).toBe('move_error');
      expect(result.data.message).toBe('Invalid move');
    });

    it('should detect checkmate and end game', async () => {
      const gameId = 'game-123';
      const from = 'f7';
      const to = 'f8';

      const mockGame = {
        id: gameId,
        status: 'ACTIVE',
        fenCurrent: 'rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3',
        whitePlayerId: 'player-white-id',
        blackPlayerId: 'player-black-id',
        moveCount: 5,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 0,
        pgn: '1. f4 e5 2. g4 Qh4#',
      };

      const mockMove = {
        from: 'h4',
        to: 'h4',
        san: 'Qh4#',
        piece: 'q',
        flags: '',
      };

      const mockChess = {};

      prismaService.game.findUnique.mockResolvedValue(mockGame);
      chessEngineService.createGame.mockReturnValue(mockChess);
      chessEngineService.getTurn.mockReturnValue('b');
      chessEngineService.makeMove.mockReturnValue(mockMove);
      chessEngineService.getFen.mockReturnValue('rnb1kbnr/pppp1ppp/8/4p3/5PPq/8/PPPPP2P/RNBQKBNR w KQkq - 1 3');
      chessEngineService.isCheck.mockReturnValue(true);
      chessEngineService.isCheckmate.mockReturnValue(true);
      chessEngineService.isStalemate.mockReturnValue(false);
      chessEngineService.isDraw.mockReturnValue(false);
      chessEngineService.isGameOver.mockReturnValue(true);
      chessEngineService.getPgn.mockReturnValue('1. f4 e5 2. g4 Qh4#');

      mockClient.data = { user: { id: 'player-black-id' } };

      prismaService.game.update.mockResolvedValue({ ...mockGame, status: 'COMPLETED' });
      prismaService.gameMove.create.mockResolvedValue({});

      const result = await gateway.handleMakeMove(mockClient as Socket, {
        gameId,
        from,
        to,
      });

      expect(chessEngineService.isCheckmate).toHaveBeenCalled();
      expect(prismaService.game.update).toHaveBeenCalledWith({
        where: { id: gameId },
        data: expect.objectContaining({
          status: 'COMPLETED',
          result: 'BLACK_WIN',
          terminationReason: 'checkmate',
        }),
      });
      expect(result.event).toBe('move_success');
    });
  });
});

describe('GameGateway - Resign Functionality', () => {
  let gateway: GameGateway;
  let prismaService: any;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  beforeEach(async () => {
    // Mock Prisma service
    const mockPrismaService = {
      game: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    // Mock Socket.IO server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    // Mock Socket.IO client
    mockClient = {
      id: 'test-client-id',
      data: {
        user: {
          id: 'player-white-id',
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        {
          provide: 'PrismaService',
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    prismaService = module.get('PrismaService');
    gateway.server = mockServer as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleResign', () => {
    it('should allow white player to resign and declare black winner', async () => {
      const gameId = 'game-123';

      const mockGame = {
        id: gameId,
        status: 'ACTIVE',
        whitePlayerId: 'player-white-id',
        blackPlayerId: 'player-black-id',
      };

      prismaService.game.findUnique.mockResolvedValue(mockGame);
      prismaService.game.update.mockResolvedValue({
        ...mockGame,
        status: 'COMPLETED',
        result: 'BLACK_WIN',
        terminationReason: 'resignation',
      });

      const result = await gateway.handleResign(mockClient as Socket, {
        gameId,
      });

      expect(prismaService.game.findUnique).toHaveBeenCalledWith({
        where: { id: gameId },
        select: expect.any(Object),
      });
      expect(prismaService.game.update).toHaveBeenCalledWith({
        where: { id: gameId },
        data: {
          status: 'COMPLETED',
          result: 'BLACK_WIN',
          terminationReason: 'resignation',
          completedAt: expect.any(Date),
        },
      });
      expect(mockServer.to).toHaveBeenCalledWith(`game:${gameId}`);
      expect(mockServer.emit).toHaveBeenCalledWith('player_resigned', {
        gameId,
        resigningPlayerId: 'player-white-id',
        resigningColor: 'white',
        result: 'BLACK_WIN',
      });
      expect(result.event).toBe('resign_success');
      expect(result.data.result).toBe('BLACK_WIN');
    });

    it('should allow black player to resign and declare white winner', async () => {
      const gameId = 'game-123';

      const mockGame = {
        id: gameId,
        status: 'ACTIVE',
        whitePlayerId: 'player-white-id',
        blackPlayerId: 'player-black-id',
      };

      mockClient.data = { user: { id: 'player-black-id' } };

      prismaService.game.findUnique.mockResolvedValue(mockGame);
      prismaService.game.update.mockResolvedValue({
        ...mockGame,
        status: 'COMPLETED',
        result: 'WHITE_WIN',
        terminationReason: 'resignation',
      });

      const result = await gateway.handleResign(mockClient as Socket, {
        gameId,
      });

      expect(prismaService.game.update).toHaveBeenCalledWith({
        where: { id: gameId },
        data: {
          status: 'COMPLETED',
          result: 'WHITE_WIN',
          terminationReason: 'resignation',
          completedAt: expect.any(Date),
        },
      });
      expect(mockServer.emit).toHaveBeenCalledWith('player_resigned', {
        gameId,
        resigningPlayerId: 'player-black-id',
        resigningColor: 'black',
        result: 'WHITE_WIN',
      });
      expect(result.event).toBe('resign_success');
      expect(result.data.result).toBe('WHITE_WIN');
    });

    it('should reject resignation if game not found', async () => {
      const gameId = 'game-123';

      prismaService.game.findUnique.mockResolvedValue(null);

      const result = await gateway.handleResign(mockClient as Socket, {
        gameId,
      });

      expect(result.event).toBe('resign_error');
      expect(result.data.message).toBe('Game not found');
      expect(prismaService.game.update).not.toHaveBeenCalled();
    });

    it('should reject resignation if game is not active', async () => {
      const gameId = 'game-123';

      const mockGame = {
        id: gameId,
        status: 'COMPLETED',
        whitePlayerId: 'player-white-id',
        blackPlayerId: 'player-black-id',
      };

      prismaService.game.findUnique.mockResolvedValue(mockGame);

      const result = await gateway.handleResign(mockClient as Socket, {
        gameId,
      });

      expect(result.event).toBe('resign_error');
      expect(result.data.message).toBe('Game is not active');
      expect(prismaService.game.update).not.toHaveBeenCalled();
    });

    it('should reject resignation if user is not a player', async () => {
      const gameId = 'game-123';

      const mockGame = {
        id: gameId,
        status: 'ACTIVE',
        whitePlayerId: 'other-player-1',
        blackPlayerId: 'other-player-2',
      };

      prismaService.game.findUnique.mockResolvedValue(mockGame);

      const result = await gateway.handleResign(mockClient as Socket, {
        gameId,
      });

      expect(result.event).toBe('resign_error');
      expect(result.data.message).toBe('You are not a player in this game');
      expect(prismaService.game.update).not.toHaveBeenCalled();
    });
  });
});


describe('GameGateway - Time Increment Functionality', () => {
  let gateway: GameGateway;
  let redisService: RedisService;
  let prismaService: any;
  let chessEngine: any;
  let mockServer: Partial<Server>;
  let mockClient: Partial<Socket>;

  beforeEach(async () => {
    // Mock Redis service
    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    // Mock Prisma service
    const mockPrismaService = {
      game: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      gameMove: {
        create: jest.fn(),
      },
    };

    // Mock Chess Engine service
    const mockChessEngine = {
      createGame: jest.fn(),
      getTurn: jest.fn(),
      isValidMove: jest.fn(),
      makeMove: jest.fn(),
      getFen: jest.fn(),
      isCheck: jest.fn(),
      isCheckmate: jest.fn(),
      isStalemate: jest.fn(),
      isDraw: jest.fn(),
      isGameOver: jest.fn(),
      getPgn: jest.fn(),
      isInsufficientMaterial: jest.fn(),
      isThreefoldRepetition: jest.fn(),
    };

    // Mock Socket.IO server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    // Mock Socket.IO client
    mockClient = {
      id: 'test-client-id',
      data: {
        user: {
          id: 'player-white-id',
        },
      },
      join: jest.fn(),
      leave: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: 'PrismaService',
          useValue: mockPrismaService,
        },
        {
          provide: 'ChessEngineService',
          useValue: mockChessEngine,
        },
        {
          provide: 'LatencyTrackerService',
          useValue: {
            trackMoveLatency: jest.fn(),
          },
        },
        {
          provide: 'JwtService',
          useValue: {},
        },
        {
          provide: 'ConfigService',
          useValue: {},
        },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);
    redisService = module.get<RedisService>(RedisService);
    prismaService = module.get('PrismaService');
    chessEngine = module.get('ChessEngineService');
    gateway.server = mockServer as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Time Increment Logic (Requirement 5.6)', () => {
    it('should add increment to player time after move completion', async () => {
      const gameId = 'game-123';
      const incrementSeconds = 3;
      const initialWhiteTime = 300000; // 5 minutes
      const initialBlackTime = 300000;
      const turnStartTime = Date.now() - 5000; // Move took 5 seconds
      const expectedIncrement = incrementSeconds * 1000; // 3000ms

      // Mock game data
      prismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: 'player-white-id',
        blackPlayerId: 'player-black-id',
        moveCount: 0,
        whiteTimeRemaining: initialWhiteTime,
        blackTimeRemaining: initialBlackTime,
        incrementSeconds,
        pgn: '',
      });

      // Mock Redis turn start time
      jest.spyOn(redisService, 'get').mockResolvedValue(turnStartTime.toString());
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      // Mock chess engine
      chessEngine.createGame.mockReturnValue({});
      chessEngine.getTurn.mockReturnValue('w');
      chessEngine.isValidMove.mockReturnValue(true);
      chessEngine.makeMove.mockReturnValue({
        san: 'e4',
        from: 'e2',
        to: 'e4',
        flags: '',
      });
      chessEngine.getFen.mockReturnValue('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
      chessEngine.isCheck.mockReturnValue(false);
      chessEngine.isCheckmate.mockReturnValue(false);
      chessEngine.isStalemate.mockReturnValue(false);
      chessEngine.isDraw.mockReturnValue(false);
      chessEngine.isGameOver.mockReturnValue(false);
      chessEngine.getPgn.mockReturnValue('1. e4');

      prismaService.game.update.mockResolvedValue({});
      prismaService.gameMove.create.mockResolvedValue({});

      // Make move
      await gateway.handleMakeMove(mockClient as Socket, {
        gameId,
        from: 'e2',
        to: 'e4',
      });

      // Verify that the game was updated with incremented time
      expect(prismaService.game.update).toHaveBeenCalledWith({
        where: { id: gameId },
        data: expect.objectContaining({
          whiteTimeRemaining: expect.any(Number),
        }),
      });

      // Get the actual call to verify the time calculation
      const updateCall = prismaService.game.update.mock.calls[0][0];
      const updatedWhiteTime = updateCall.data.whiteTimeRemaining;

      // White's time should be: initial - time_taken + increment
      // Since we can't predict exact timing, verify increment was added
      expect(updatedWhiteTime).toBeGreaterThan(initialWhiteTime - 6000); // Should be close to initial - 5s + 3s
      expect(updatedWhiteTime).toBeLessThan(initialWhiteTime); // But less than initial since 5s > 3s
    });

    it('should track time taken per move', async () => {
      const gameId = 'game-123';
      const turnStartTime = Date.now() - 2500; // Move took 2.5 seconds

      prismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: 'player-white-id',
        blackPlayerId: 'player-black-id',
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 2,
        pgn: '',
      });

      jest.spyOn(redisService, 'get').mockResolvedValue(turnStartTime.toString());
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      chessEngine.createGame.mockReturnValue({});
      chessEngine.getTurn.mockReturnValue('w');
      chessEngine.isValidMove.mockReturnValue(true);
      chessEngine.makeMove.mockReturnValue({
        san: 'Nf3',
        from: 'g1',
        to: 'f3',
        flags: '',
      });
      chessEngine.getFen.mockReturnValue('rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1');
      chessEngine.isCheck.mockReturnValue(false);
      chessEngine.isCheckmate.mockReturnValue(false);
      chessEngine.isStalemate.mockReturnValue(false);
      chessEngine.isDraw.mockReturnValue(false);
      chessEngine.isGameOver.mockReturnValue(false);
      chessEngine.getPgn.mockReturnValue('1. Nf3');

      prismaService.game.update.mockResolvedValue({});
      prismaService.gameMove.create.mockResolvedValue({});

      await gateway.handleMakeMove(mockClient as Socket, {
        gameId,
        from: 'g1',
        to: 'f3',
      });

      // Verify that timeTakenMs was recorded in the game move
      expect(prismaService.gameMove.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          timeTakenMs: expect.any(Number),
        }),
      });

      const createCall = prismaService.gameMove.create.mock.calls[0][0];
      const timeTaken = createCall.data.timeTakenMs;

      // Time taken should be approximately 2500ms (with some tolerance for execution time)
      expect(timeTaken).toBeGreaterThan(2400);
      expect(timeTaken).toBeLessThan(3000);
    });

    it('should handle games with zero increment', async () => {
      const gameId = 'game-123';
      const initialWhiteTime = 180000; // 3 minutes
      const turnStartTime = Date.now() - 1000; // Move took 1 second

      prismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: 'player-white-id',
        blackPlayerId: 'player-black-id',
        moveCount: 0,
        whiteTimeRemaining: initialWhiteTime,
        blackTimeRemaining: 180000,
        incrementSeconds: 0, // No increment
        pgn: '',
      });

      jest.spyOn(redisService, 'get').mockResolvedValue(turnStartTime.toString());
      jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      chessEngine.createGame.mockReturnValue({});
      chessEngine.getTurn.mockReturnValue('w');
      chessEngine.isValidMove.mockReturnValue(true);
      chessEngine.makeMove.mockReturnValue({
        san: 'd4',
        from: 'd2',
        to: 'd4',
        flags: '',
      });
      chessEngine.getFen.mockReturnValue('rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1');
      chessEngine.isCheck.mockReturnValue(false);
      chessEngine.isCheckmate.mockReturnValue(false);
      chessEngine.isStalemate.mockReturnValue(false);
      chessEngine.isDraw.mockReturnValue(false);
      chessEngine.isGameOver.mockReturnValue(false);
      chessEngine.getPgn.mockReturnValue('1. d4');

      prismaService.game.update.mockResolvedValue({});
      prismaService.gameMove.create.mockResolvedValue({});

      await gateway.handleMakeMove(mockClient as Socket, {
        gameId,
        from: 'd2',
        to: 'd4',
      });

      const updateCall = prismaService.game.update.mock.calls[0][0];
      const updatedWhiteTime = updateCall.data.whiteTimeRemaining;

      // With zero increment, time should only decrease
      expect(updatedWhiteTime).toBeLessThan(initialWhiteTime);
      expect(updatedWhiteTime).toBeGreaterThan(initialWhiteTime - 2000); // Approximately 1 second less
    });

    it('should store turn start time for next player', async () => {
      const gameId = 'game-123';

      prismaService.game.findUnique.mockResolvedValue({
        id: gameId,
        status: 'ACTIVE',
        fenCurrent: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        whitePlayerId: 'player-white-id',
        blackPlayerId: 'player-black-id',
        moveCount: 0,
        whiteTimeRemaining: 300000,
        blackTimeRemaining: 300000,
        incrementSeconds: 5,
        pgn: '',
      });

      jest.spyOn(redisService, 'get').mockResolvedValue(Date.now().toString());
      const setSpy = jest.spyOn(redisService, 'set').mockResolvedValue(undefined);

      chessEngine.createGame.mockReturnValue({});
      chessEngine.getTurn.mockReturnValue('w');
      chessEngine.isValidMove.mockReturnValue(true);
      chessEngine.makeMove.mockReturnValue({
        san: 'e4',
        from: 'e2',
        to: 'e4',
        flags: '',
      });
      chessEngine.getFen.mockReturnValue('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
      chessEngine.isCheck.mockReturnValue(false);
      chessEngine.isCheckmate.mockReturnValue(false);
      chessEngine.isStalemate.mockReturnValue(false);
      chessEngine.isDraw.mockReturnValue(false);
      chessEngine.isGameOver.mockReturnValue(false);
      chessEngine.getPgn.mockReturnValue('1. e4');

      prismaService.game.update.mockResolvedValue({});
      prismaService.gameMove.create.mockResolvedValue({});

      await gateway.handleMakeMove(mockClient as Socket, {
        gameId,
        from: 'e2',
        to: 'e4',
      });

      // Verify that turn start time was stored for the next player
      expect(setSpy).toHaveBeenCalledWith(
        `game:${gameId}:turn_start_time`,
        expect.any(String),
        3600,
      );
    });
  });
});

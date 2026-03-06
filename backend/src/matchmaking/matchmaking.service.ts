import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import { GamesService } from '../games/games.service';
import { BlocksService } from '../blocks/blocks.service';
import { BanService } from '../admin/ban.service';
import { TimeControl } from '@prisma/client';

export interface QueueEntry {
  userId: string;
  rating: number;
  timeControl: TimeControl;
  ratingRange: number;
  joinedAt: number;
}

export interface QueueStatus {
  position: number;
  waitTimeSeconds: number;
  queueSize: number;
}

export interface Challenge {
  id: string;
  senderId: string;
  receiverId: string;
  timeControl: TimeControl;
  initialTimeMinutes: number;
  incrementSeconds: number;
  isRated: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface RematchOffer {
  id: string;
  gameId: string;
  senderId: string;
  receiverId: string;
  timeControl: TimeControl;
  initialTimeMinutes: number;
  incrementSeconds: number;
  isRated: boolean;
  createdAt: number;
  expiresAt: number;
}

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);
  private readonly QUEUE_KEY_PREFIX = 'matchmaking:queue:';
  private readonly USER_QUEUE_KEY_PREFIX = 'matchmaking:user:';
  private readonly CHALLENGE_KEY_PREFIX = 'challenge:';
  private readonly USER_CHALLENGE_KEY_PREFIX = 'user:challenge:';
  private readonly REMATCH_KEY_PREFIX = 'rematch:';
  private readonly USER_REMATCH_KEY_PREFIX = 'user:rematch:';
  private readonly CHALLENGE_TTL = 60; // 60 seconds
  private readonly REMATCH_TTL = 60; // 60 seconds
  private readonly USER_QUEUE_TTL = 300;
  private matchmakingInterval: NodeJS.Timeout | null = null;
  private matchmakingGateway: any = null; // Will be set by gateway

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly gamesService: GamesService,
    private readonly blocksService: BlocksService,
    private readonly banService: BanService,
  ) {}

  setGateway(gateway: any) {
    this.matchmakingGateway = gateway;
  }

  startMatchmaking() {
    if (this.matchmakingInterval) {
      this.logger.warn('Matchmaking already running');
      return;
    }
    this.logger.log('Starting matchmaking algorithm');
    this.matchmakingInterval = setInterval(async () => {
      await this.processMatchmaking();
    }, 2000);
  }

  stopMatchmaking() {
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
      this.matchmakingInterval = null;
      this.logger.log('Stopped matchmaking algorithm');
    }
  }

  private async processMatchmaking() {
    const timeControls = [
      TimeControl.BULLET,
      TimeControl.BLITZ,
      TimeControl.RAPID,
      TimeControl.CLASSICAL,
    ];
    for (const timeControl of timeControls) {
      try {
        await this.matchPlayersInQueue(timeControl);
      } catch (error) {
        this.logger.error(`Error processing ${timeControl} queue: ${error.message}`);
      }
    }
  }

  private async matchPlayersInQueue(timeControl: TimeControl) {
    const entries = await this.getQueueEntries(timeControl);
    if (entries.length < 2) {
      return;
    }
    const sortedEntries = entries.sort((a, b) => a.joinedAt - b.joinedAt);
    const matched: Set<string> = new Set();
    for (let i = 0; i < sortedEntries.length; i++) {
      if (matched.has(sortedEntries[i].userId)) {
        continue;
      }
      const player1 = sortedEntries[i];
      for (let j = i + 1; j < sortedEntries.length; j++) {
        if (matched.has(sortedEntries[j].userId)) {
          continue;
        }
        const player2 = sortedEntries[j];
        const ratingDiff = Math.abs(player1.rating - player2.rating);
        const maxRange = Math.min(player1.ratingRange, player2.ratingRange);
        if (ratingDiff <= maxRange) {
          await this.createMatchedGame(player1, player2, timeControl);
          matched.add(player1.userId);
          matched.add(player2.userId);
          break;
        }
      }
    }
  }

  private async createMatchedGame(
    player1: QueueEntry,
    player2: QueueEntry,
    timeControl: TimeControl,
  ) {
    try {
      const isPlayer1White = Math.random() < 0.5;
      const whitePlayerId = isPlayer1White ? player1.userId : player2.userId;
      const blackPlayerId = isPlayer1White ? player2.userId : player1.userId;
      const { initialTimeMinutes, incrementSeconds } = this.getTimeControlSettings(timeControl);
      const game = await this.gamesService.createGame(
        {
          whitePlayerId,
          blackPlayerId,
          timeControl,
          initialTimeMinutes,
          incrementSeconds,
          isRated: true,
        },
        whitePlayerId,
      );
      this.logger.log(
        `Matched ${player1.userId} (${player1.rating}) vs ${player2.userId} (${player2.rating}) - Game ${game.id}`,
      );
      await this.leaveQueue(player1.userId);
      await this.leaveQueue(player2.userId);
      
      // Notify players via WebSocket gateway
      if (this.matchmakingGateway) {
        await this.matchmakingGateway.notifyMatchFound(
          player1.userId,
          player2.userId,
          game.id,
          timeControl,
          whitePlayerId,
          blackPlayerId,
        );
      }
      
      return game;
    } catch (error) {
      this.logger.error(`Failed to create matched game: ${error.message}`);
      throw error;
    }
  }

  private getTimeControlSettings(timeControl: TimeControl): {
    initialTimeMinutes: number;
    incrementSeconds: number;
  } {
    switch (timeControl) {
      case TimeControl.BULLET:
        return { initialTimeMinutes: 1, incrementSeconds: 0 };
      case TimeControl.BLITZ:
        return { initialTimeMinutes: 3, incrementSeconds: 2 };
      case TimeControl.RAPID:
        return { initialTimeMinutes: 10, incrementSeconds: 0 };
      case TimeControl.CLASSICAL:
        return { initialTimeMinutes: 30, incrementSeconds: 0 };
      default:
        return { initialTimeMinutes: 5, incrementSeconds: 0 };
    }
  }

  async joinQueue(
    userId: string,
    timeControl: TimeControl,
    ratingRange: number = 200,
  ): Promise<QueueStatus> {
    // Check if user is banned (Requirements: 24.16)
    const isBanned = await this.banService.isUserBanned(userId);
    if (isBanned) {
      throw new BadRequestException('Cannot join matchmaking while banned');
    }

    // Check if user already in queue
    const existingQueue = await this.getUserQueue(userId);
    if (existingQueue) {
      throw new BadRequestException(`User is already in ${existingQueue} queue`);
    }

    // Check if user has active game (Requirements: 7.10)
    const hasActive = await this.hasActiveGame(userId);
    if (hasActive) {
      throw new BadRequestException('Cannot join matchmaking while in an active game');
    }

    const ratingRecord = await this.prisma.rating.findUnique({
      where: { userId_timeControl: { userId, timeControl } },
    });
    const rating = ratingRecord?.rating || 1200;
    const entry: QueueEntry = {
      userId,
      rating,
      timeControl,
      ratingRange,
      joinedAt: Date.now(),
    };
    const queueKey = this.QUEUE_KEY_PREFIX + timeControl;
    const client = this.redis.getClient();
    await client.zadd(queueKey, entry.joinedAt, JSON.stringify(entry));
    const userQueueKey = this.USER_QUEUE_KEY_PREFIX + userId;
    await this.redis.set(userQueueKey, timeControl, this.USER_QUEUE_TTL);
    this.logger.log(`User ${userId} joined ${timeControl} queue (rating: ${rating})`);
    return this.getQueueStatus(userId, timeControl);
  }

  async leaveQueue(userId: string): Promise<boolean> {
    const timeControl = await this.getUserQueue(userId);
    if (!timeControl) {
      return false;
    }
    const entries = await this.getQueueEntries(timeControl);
    const userEntry = entries.find((e) => e.userId === userId);
    if (userEntry) {
      const queueKey = this.QUEUE_KEY_PREFIX + timeControl;
      const client = this.redis.getClient();
      await client.zrem(queueKey, JSON.stringify(userEntry));
    }
    const userQueueKey = this.USER_QUEUE_KEY_PREFIX + userId;
    await this.redis.delete(userQueueKey);
    this.logger.log(`User ${userId} left ${timeControl} queue`);
    return true;
  }

  async getQueueStatus(userId: string, timeControl: TimeControl): Promise<QueueStatus> {
    const entries = await this.getQueueEntries(timeControl);
    const userIndex = entries.findIndex((e) => e.userId === userId);
    if (userIndex === -1) {
      throw new BadRequestException('User not in queue');
    }
    const userEntry = entries[userIndex];
    const waitTimeSeconds = Math.floor((Date.now() - userEntry.joinedAt) / 1000);
    return {
      position: userIndex + 1,
      waitTimeSeconds,
      queueSize: entries.length,
    };
  }

  async getQueueEntries(timeControl: TimeControl): Promise<QueueEntry[]> {
    const queueKey = this.QUEUE_KEY_PREFIX + timeControl;
    const client = this.redis.getClient();
    const entries = await client.zrange(queueKey, 0, -1);
    return entries.map((entry) => JSON.parse(entry) as QueueEntry);
  }

  async getUserQueue(userId: string): Promise<TimeControl | null> {
    const userQueueKey = this.USER_QUEUE_KEY_PREFIX + userId;
    const timeControl = await this.redis.get(userQueueKey);
    return timeControl as TimeControl | null;
  }

  /**
   * Check if user has any active games
   * Requirements: 7.10
   */
  private async hasActiveGame(userId: string): Promise<boolean> {
    const activeGames = await this.prisma.game.findFirst({
      where: {
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
        status: {
          in: ['PENDING', 'ACTIVE'],
        },
      },
      select: { id: true },
    });

    return activeGames !== null;
  }

  async clearAllQueues(): Promise<void> {
    const client = this.redis.getClient();
    const keys = await client.keys(this.QUEUE_KEY_PREFIX + '*');
    if (keys.length > 0) {
      await client.del(...keys);
    }
    const userKeys = await client.keys(this.USER_QUEUE_KEY_PREFIX + '*');
    if (userKeys.length > 0) {
      await client.del(...userKeys);
    }
    this.logger.log('Cleared all matchmaking queues');
  }

  /**
   * Create a direct challenge to another player
   * Requirements: 7.4
   */
  async createChallenge(
    senderId: string,
    receiverId: string,
    timeControl: TimeControl,
    initialTimeMinutes: number,
    incrementSeconds: number,
    isRated: boolean = true,
  ): Promise<Challenge> {
    // Validate sender and receiver are different
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot challenge yourself');
    }

    // Check if there's a block relationship
    const hasBlock = await this.blocksService.hasBlockRelationship(senderId, receiverId);
    if (hasBlock) {
      throw new BadRequestException('Cannot challenge this user');
    }

    // Check if receiver exists
    const receiver = await this.prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true, username: true, isBanned: true },
    });

    if (!receiver) {
      throw new BadRequestException('Receiver not found');
    }

    if (receiver.isBanned) {
      throw new BadRequestException('Cannot challenge banned user');
    }

    // Check if sender already has a pending challenge to this receiver
    const existingChallenge = await this.getPendingChallenge(senderId, receiverId);
    if (existingChallenge) {
      throw new BadRequestException('You already have a pending challenge to this user');
    }

    const challengeId = `${senderId}-${receiverId}-${Date.now()}`;
    const now = Date.now();
    const challenge: Challenge = {
      id: challengeId,
      senderId,
      receiverId,
      timeControl,
      initialTimeMinutes,
      incrementSeconds,
      isRated,
      createdAt: now,
      expiresAt: now + this.CHALLENGE_TTL * 1000,
    };

    // Store challenge in Redis with TTL
    const challengeKey = this.CHALLENGE_KEY_PREFIX + challengeId;
    await this.redis.set(challengeKey, JSON.stringify(challenge), this.CHALLENGE_TTL);

    // Track challenge for sender and receiver
    const senderChallengeKey = this.USER_CHALLENGE_KEY_PREFIX + `sent:${senderId}`;
    const receiverChallengeKey = this.USER_CHALLENGE_KEY_PREFIX + `received:${receiverId}`;
    
    await this.redis.set(senderChallengeKey, challengeId, this.CHALLENGE_TTL);
    await this.redis.set(receiverChallengeKey, challengeId, this.CHALLENGE_TTL);

    this.logger.log(`Challenge created: ${challengeId} from ${senderId} to ${receiverId}`);

    // Notify receiver via WebSocket
    if (this.matchmakingGateway) {
      await this.matchmakingGateway.notifyChallengeReceived(challenge);
    }

    return challenge;
  }

  /**
   * Accept a challenge
   * Requirements: 7.6
   */
  async acceptChallenge(challengeId: string, userId: string): Promise<any> {
    const challenge = await this.getChallenge(challengeId);
    
    if (!challenge) {
      throw new BadRequestException('Challenge not found or expired');
    }

    if (challenge.receiverId !== userId) {
      throw new BadRequestException('You are not the receiver of this challenge');
    }

    // Check if user has active game (Requirements: 7.10)
    const hasActive = await this.hasActiveGame(userId);
    if (hasActive) {
      throw new BadRequestException('Cannot accept challenge while in an active game');
    }

    // Check if sender has active game (Requirements: 7.10)
    const senderHasActive = await this.hasActiveGame(challenge.senderId);
    if (senderHasActive) {
      throw new BadRequestException('Challenge sender is currently in an active game');
    }

    // Create game
    const game = await this.gamesService.createGame(
      {
        whitePlayerId: Math.random() < 0.5 ? challenge.senderId : challenge.receiverId,
        blackPlayerId: Math.random() < 0.5 ? challenge.senderId : challenge.receiverId,
        timeControl: challenge.timeControl,
        initialTimeMinutes: challenge.initialTimeMinutes,
        incrementSeconds: challenge.incrementSeconds,
        isRated: challenge.isRated,
      },
      challenge.senderId,
    );

    // Delete challenge
    await this.deleteChallenge(challengeId);

    this.logger.log(`Challenge ${challengeId} accepted - Game ${game.id} created`);

    // Notify sender via WebSocket
    if (this.matchmakingGateway) {
      await this.matchmakingGateway.notifyChallengeAccepted(challenge, game.id);
    }

    return game;
  }

  /**
   * Decline a challenge
   * Requirements: 7.6
   */
  async declineChallenge(challengeId: string, userId: string): Promise<void> {
    const challenge = await this.getChallenge(challengeId);
    
    if (!challenge) {
      throw new BadRequestException('Challenge not found or expired');
    }

    if (challenge.receiverId !== userId) {
      throw new BadRequestException('You are not the receiver of this challenge');
    }

    // Delete challenge
    await this.deleteChallenge(challengeId);

    this.logger.log(`Challenge ${challengeId} declined by ${userId}`);

    // Notify sender via WebSocket
    if (this.matchmakingGateway) {
      await this.matchmakingGateway.notifyChallengeDeclined(challenge);
    }
  }

  /**
   * Get a challenge by ID
   */
  async getChallenge(challengeId: string): Promise<Challenge | null> {
    const challengeKey = this.CHALLENGE_KEY_PREFIX + challengeId;
    const data = await this.redis.get(challengeKey);
    
    if (!data) {
      return null;
    }

    return JSON.parse(data) as Challenge;
  }

  /**
   * Get pending challenge between two users
   */
  async getPendingChallenge(senderId: string, receiverId: string): Promise<Challenge | null> {
    const senderChallengeKey = this.USER_CHALLENGE_KEY_PREFIX + `sent:${senderId}`;
    const challengeId = await this.redis.get(senderChallengeKey);
    
    if (!challengeId) {
      return null;
    }

    const challenge = await this.getChallenge(challengeId);
    if (challenge && challenge.receiverId === receiverId) {
      return challenge;
    }

    return null;
  }

  /**
   * Get received challenges for a user
   */
  async getReceivedChallenges(userId: string): Promise<Challenge[]> {
    const receiverChallengeKey = this.USER_CHALLENGE_KEY_PREFIX + `received:${userId}`;
    const challengeId = await this.redis.get(receiverChallengeKey);
    
    if (!challengeId) {
      return [];
    }

    const challenge = await this.getChallenge(challengeId);
    return challenge ? [challenge] : [];
  }

  /**
   * Get sent challenges for a user
   */
  async getSentChallenges(userId: string): Promise<Challenge[]> {
    const senderChallengeKey = this.USER_CHALLENGE_KEY_PREFIX + `sent:${userId}`;
    const challengeId = await this.redis.get(senderChallengeKey);
    
    if (!challengeId) {
      return [];
    }

    const challenge = await this.getChallenge(challengeId);
    return challenge ? [challenge] : [];
  }

  /**
   * Delete a challenge
   */
  private async deleteChallenge(challengeId: string): Promise<void> {
    const challenge = await this.getChallenge(challengeId);
    
    if (!challenge) {
      return;
    }

    const challengeKey = this.CHALLENGE_KEY_PREFIX + challengeId;
    const senderChallengeKey = this.USER_CHALLENGE_KEY_PREFIX + `sent:${challenge.senderId}`;
    const receiverChallengeKey = this.USER_CHALLENGE_KEY_PREFIX + `received:${challenge.receiverId}`;

    await Promise.all([
      this.redis.delete(challengeKey),
      this.redis.delete(senderChallengeKey),
      this.redis.delete(receiverChallengeKey),
    ]);
  }

  /**
   * Create a rematch offer after game completion
   * Requirements: 7.8
   */
  async createRematchOffer(gameId: string, senderId: string): Promise<RematchOffer> {
    // Validate game exists and is completed
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        whitePlayerId: true,
        blackPlayerId: true,
        status: true,
        timeControl: true,
        initialTimeMinutes: true,
        incrementSeconds: true,
        isRated: true,
      },
    });

    if (!game) {
      throw new BadRequestException('Game not found');
    }

    if (game.status !== 'COMPLETED') {
      throw new BadRequestException('Game is not completed');
    }

    // Validate sender is a player in the game
    if (game.whitePlayerId !== senderId && game.blackPlayerId !== senderId) {
      throw new BadRequestException('You are not a player in this game');
    }

    const receiverId = game.whitePlayerId === senderId ? game.blackPlayerId : game.whitePlayerId;

    // Check if rematch offer already exists
    const existingRematch = await this.getPendingRematch(gameId);
    if (existingRematch) {
      throw new BadRequestException('Rematch offer already exists for this game');
    }

    const rematchId = `rematch-${gameId}-${Date.now()}`;
    const now = Date.now();
    const rematchOffer: RematchOffer = {
      id: rematchId,
      gameId,
      senderId,
      receiverId,
      timeControl: game.timeControl,
      initialTimeMinutes: game.initialTimeMinutes,
      incrementSeconds: game.incrementSeconds,
      isRated: game.isRated,
      createdAt: now,
      expiresAt: now + this.REMATCH_TTL * 1000,
    };

    // Store rematch offer in Redis with TTL
    const rematchKey = this.REMATCH_KEY_PREFIX + rematchId;
    await this.redis.set(rematchKey, JSON.stringify(rematchOffer), this.REMATCH_TTL);

    // Track rematch for sender and receiver
    const senderRematchKey = this.USER_REMATCH_KEY_PREFIX + `sent:${senderId}:${gameId}`;
    const receiverRematchKey = this.USER_REMATCH_KEY_PREFIX + `received:${receiverId}:${gameId}`;
    
    await this.redis.set(senderRematchKey, rematchId, this.REMATCH_TTL);
    await this.redis.set(receiverRematchKey, rematchId, this.REMATCH_TTL);

    this.logger.log(`Rematch offer created: ${rematchId} for game ${gameId} from ${senderId} to ${receiverId}`);

    // Notify receiver via WebSocket
    if (this.matchmakingGateway) {
      await this.matchmakingGateway.notifyRematchOffered(rematchOffer);
    }

    return rematchOffer;
  }

  /**
   * Accept a rematch offer
   * Requirements: 7.8
   */
  async acceptRematchOffer(rematchId: string, userId: string): Promise<any> {
    const rematchOffer = await this.getRematchOffer(rematchId);
    
    if (!rematchOffer) {
      throw new BadRequestException('Rematch offer not found or expired');
    }

    if (rematchOffer.receiverId !== userId) {
      throw new BadRequestException('You are not the receiver of this rematch offer');
    }

    // Check if user has active game (Requirements: 7.10)
    const hasActive = await this.hasActiveGame(userId);
    if (hasActive) {
      throw new BadRequestException('Cannot accept rematch while in an active game');
    }

    // Check if sender has active game (Requirements: 7.10)
    const senderHasActive = await this.hasActiveGame(rematchOffer.senderId);
    if (senderHasActive) {
      throw new BadRequestException('Rematch sender is currently in an active game');
    }

    // Create new game with swapped colors
    const originalGame = await this.prisma.game.findUnique({
      where: { id: rematchOffer.gameId },
      select: { whitePlayerId: true, blackPlayerId: true },
    });

    if (!originalGame) {
      throw new BadRequestException('Original game not found');
    }

    // Swap colors for rematch
    const whitePlayerId = originalGame.blackPlayerId;
    const blackPlayerId = originalGame.whitePlayerId;

    const game = await this.gamesService.createGame(
      {
        whitePlayerId,
        blackPlayerId,
        timeControl: rematchOffer.timeControl,
        initialTimeMinutes: rematchOffer.initialTimeMinutes,
        incrementSeconds: rematchOffer.incrementSeconds,
        isRated: rematchOffer.isRated,
      },
      rematchOffer.senderId,
    );

    // Delete rematch offer
    await this.deleteRematchOffer(rematchId);

    this.logger.log(`Rematch offer ${rematchId} accepted - Game ${game.id} created`);

    // Notify sender via WebSocket
    if (this.matchmakingGateway) {
      await this.matchmakingGateway.notifyRematchAccepted(rematchOffer, game.id);
    }

    return game;
  }

  /**
   * Decline a rematch offer
   * Requirements: 7.8
   */
  async declineRematchOffer(rematchId: string, userId: string): Promise<void> {
    const rematchOffer = await this.getRematchOffer(rematchId);
    
    if (!rematchOffer) {
      throw new BadRequestException('Rematch offer not found or expired');
    }

    if (rematchOffer.receiverId !== userId) {
      throw new BadRequestException('You are not the receiver of this rematch offer');
    }

    // Delete rematch offer
    await this.deleteRematchOffer(rematchId);

    this.logger.log(`Rematch offer ${rematchId} declined by ${userId}`);

    // Notify sender via WebSocket
    if (this.matchmakingGateway) {
      await this.matchmakingGateway.notifyRematchDeclined(rematchOffer);
    }
  }

  /**
   * Get a rematch offer by ID
   */
  async getRematchOffer(rematchId: string): Promise<RematchOffer | null> {
    const rematchKey = this.REMATCH_KEY_PREFIX + rematchId;
    const data = await this.redis.get(rematchKey);
    
    if (!data) {
      return null;
    }

    return JSON.parse(data) as RematchOffer;
  }

  /**
   * Get pending rematch offer for a game
   */
  async getPendingRematch(gameId: string): Promise<RematchOffer | null> {
    const client = this.redis.getClient();
    const keys = await client.keys(this.USER_REMATCH_KEY_PREFIX + `*:${gameId}`);
    
    if (keys.length === 0) {
      return null;
    }

    const rematchId = await this.redis.get(keys[0]);
    if (!rematchId) {
      return null;
    }

    return this.getRematchOffer(rematchId);
  }

  /**
   * Get received rematch offers for a user
   */
  async getReceivedRematchOffers(userId: string): Promise<RematchOffer[]> {
    const client = this.redis.getClient();
    const keys = await client.keys(this.USER_REMATCH_KEY_PREFIX + `received:${userId}:*`);
    
    const offers: RematchOffer[] = [];
    for (const key of keys) {
      const rematchId = await this.redis.get(key);
      if (rematchId) {
        const offer = await this.getRematchOffer(rematchId);
        if (offer) {
          offers.push(offer);
        }
      }
    }
    
    return offers;
  }

  /**
   * Get sent rematch offers for a user
   */
  async getSentRematchOffers(userId: string): Promise<RematchOffer[]> {
    const client = this.redis.getClient();
    const keys = await client.keys(this.USER_REMATCH_KEY_PREFIX + `sent:${userId}:*`);
    
    const offers: RematchOffer[] = [];
    for (const key of keys) {
      const rematchId = await this.redis.get(key);
      if (rematchId) {
        const offer = await this.getRematchOffer(rematchId);
        if (offer) {
          offers.push(offer);
        }
      }
    }
    
    return offers;
  }

  /**
   * Delete a rematch offer
   */
  private async deleteRematchOffer(rematchId: string): Promise<void> {
    const rematchOffer = await this.getRematchOffer(rematchId);
    
    if (!rematchOffer) {
      return;
    }

    const rematchKey = this.REMATCH_KEY_PREFIX + rematchId;
    const senderRematchKey = this.USER_REMATCH_KEY_PREFIX + `sent:${rematchOffer.senderId}:${rematchOffer.gameId}`;
    const receiverRematchKey = this.USER_REMATCH_KEY_PREFIX + `received:${rematchOffer.receiverId}:${rematchOffer.gameId}`;

    await Promise.all([
      this.redis.delete(rematchKey),
      this.redis.delete(senderRematchKey),
      this.redis.delete(receiverRematchKey),
    ]);
  }
}

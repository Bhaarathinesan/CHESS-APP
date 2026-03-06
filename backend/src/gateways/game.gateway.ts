import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { RedisService } from '../redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { ChessEngineService } from '../chess/chess-engine.service';
import { LatencyTrackerService } from './services/latency-tracker.service';
import { StandingsService } from '../tournaments/standings.service';
import { TournamentGateway } from './tournament.gateway';
import { AntiCheatService } from '../anti-cheat/anti-cheat.service';

@WebSocketGateway({
  namespace: '/game',
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);
  private drawOfferTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private clockIntervals: Map<string, NodeJS.Timeout> = new Map();
  private disconnectionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private playerSockets: Map<string, string> = new Map(); // playerId -> socketId
  private gameRooms: Map<string, Set<string>> = new Map(); // gameId -> Set of socketIds
  private socketToGame: Map<string, string> = new Map(); // socketId -> gameId

  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly chessEngine: ChessEngineService,
    private readonly latencyTracker: LatencyTrackerService,
    private readonly standingsService: StandingsService,
    @Inject(forwardRef(() => TournamentGateway))
    private readonly tournamentGateway: TournamentGateway,
    private readonly antiCheatService: AntiCheatService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      // Extract JWT token from connection handshake
      const token = this.extractTokenFromHandshake(client);

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided (${client.id})`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('auth.jwt.secret'),
      });

      // Fetch user data from database
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          role: true,
          isBanned: true,
          emailVerified: true,
        },
      });

      // Validate user exists and is not banned
      if (!user) {
        this.logger.warn(`Connection rejected: User not found (${client.id})`);
        client.emit('error', { message: 'User not found' });
        client.disconnect();
        return;
      }

      if (user.isBanned) {
        this.logger.warn(`Connection rejected: User is banned (${client.id}, user: ${user.id})`);
        client.emit('error', { message: 'Account is banned' });
        client.disconnect();
        return;
      }

      // Attach user data to socket connection for use in message handlers
      client.data.user = user;

      this.logger.log(`Client authenticated and connected to /game: ${client.id} (user: ${user.username})`);
      
      // Emit successful authentication event
      client.emit('authenticated', { userId: user.id, username: user.username });
    } catch (error) {
      this.logger.error(`Connection authentication failed: ${error.message} (${client.id})`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  /**
   * Extract JWT token from WebSocket handshake
   * Supports token in Authorization header or query/auth parameters
   */
  private extractTokenFromHandshake(client: Socket): string | null {
    // Try to get token from Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from auth or query params (fallback for some clients)
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (token && typeof token === 'string') {
      return token;
    }

    return null;
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client disconnected from /game: ${client.id}`);
    
    // Find which game this socket was in
    const gameId = this.socketToGame.get(client.id);
    if (gameId) {
      // Remove socket from game room tracking
      const room = this.gameRooms.get(gameId);
      if (room) {
        room.delete(client.id);
        this.logger.log(`Removed socket ${client.id} from game room ${gameId}. Remaining connections: ${room.size}`);
        
        // If room is empty, clean it up
        if (room.size === 0) {
          this.cleanupGameRoom(gameId);
        }
      }
      this.socketToGame.delete(client.id);
    }
    
    // Find which player disconnected
    let disconnectedPlayerId: string | null = null;
    for (const [playerId, socketId] of this.playerSockets.entries()) {
      if (socketId === client.id) {
        disconnectedPlayerId = playerId;
        break;
      }
    }

    if (disconnectedPlayerId && gameId) {
      this.handlePlayerDisconnection(disconnectedPlayerId, client);
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_game')
  async handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    const startTime = Date.now();
    const { gameId } = data;
    const userId = client.data.user?.id;
    
    // Validate game exists
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        status: true,
        whitePlayerId: true,
        blackPlayerId: true,
        fenCurrent: true,
        moveCount: true,
        whiteTimeRemaining: true,
        blackTimeRemaining: true,
      },
    });
    
    if (!game) {
      this.logger.warn(`Client ${client.id} attempted to join non-existent game ${gameId}`);
      return {
        event: 'join_game_error',
        data: { message: 'Game not found' },
      };
    }
    
    // Validate user is a player in this game or spectator
    const isPlayer = userId && (game.whitePlayerId === userId || game.blackPlayerId === userId);
    const isSpectator = !isPlayer;
    
    // Detect if this is a reconnection (player was previously in the game)
    const isReconnection = isPlayer && this.playerSockets.has(userId);
    const wasDisconnected = isReconnection && this.disconnectionTimeouts.has(`disconnect:${gameId}:${userId}`);
    
    // Join the Socket.IO room
    client.join(`game:${gameId}`);
    
    // Track active connection
    if (!this.gameRooms.has(gameId)) {
      this.gameRooms.set(gameId, new Set());
    }
    this.gameRooms.get(gameId)!.add(client.id);
    this.socketToGame.set(client.id, gameId);
    
    // Update player socket mapping if this is a player
    if (isPlayer) {
      this.playerSockets.set(userId, client.id);
      
      // Handle reconnection logic
      if (wasDisconnected) {
        const disconnectKey = `disconnect:${gameId}:${userId}`;
        const disconnectTimeoutId = this.disconnectionTimeouts.get(disconnectKey);
        
        if (disconnectTimeoutId) {
          clearTimeout(disconnectTimeoutId);
          this.disconnectionTimeouts.delete(disconnectKey);
          
          // Resume the clock
          await this.resumePlayerClock(gameId, userId);
          
          this.logger.log(`Player ${userId} reconnected to game ${gameId}`);
        }
      }
    }
    
    const connectionCount = this.gameRooms.get(gameId)!.size;
    
    this.logger.log(
      `Client ${client.id} (user: ${userId}) joined game ${gameId} as ${isPlayer ? 'player' : 'spectator'}. ` +
      `Active connections: ${connectionCount}${wasDisconnected ? ' (RECONNECTION)' : ''}`
    );
    
    // Notify other clients in the room about the new connection
    const notificationEvent = wasDisconnected ? 'player_reconnected' : 'player_joined_room';
    client.to(`game:${gameId}`).emit(notificationEvent, {
      gameId,
      userId,
      isPlayer,
      isSpectator,
      connectionCount,
    });
    
    // Update spectator count in database if this is a spectator
    if (isSpectator) {
      await this.updateSpectatorCount(gameId);
    }
    
    // Send complete game state to the joining client (requirement 6.6)
    // This ensures client has authoritative state immediately on join
    // For reconnections, this fulfills requirement 6.5 (restore state within 2 seconds)
    const gameStateResponse = await this.handleRequestGameState(client, { gameId });
    if (gameStateResponse.event === 'game_state') {
      client.emit('initial_game_state', gameStateResponse.data);
    }
    
    const elapsedTime = Date.now() - startTime;
    this.logger.log(
      `Game state restoration completed in ${elapsedTime}ms for ${wasDisconnected ? 'reconnection' : 'initial join'} ` +
      `(client: ${client.id}, game: ${gameId})`
    );
    
    return {
      event: 'joined_game',
      data: {
        gameId,
        isPlayer,
        isSpectator,
        isReconnection: wasDisconnected,
        connectionCount,
        stateRestorationTimeMs: elapsedTime,
        game: {
          id: game.id,
          status: game.status,
          fenCurrent: game.fenCurrent,
          moveCount: game.moveCount,
        },
      },
    };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave_game')
  async handleLeaveGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    const { gameId } = data;
    const userId = client.data.user?.id;
    
    // Leave the Socket.IO room
    client.leave(`game:${gameId}`);
    
    // Remove from tracking
    const room = this.gameRooms.get(gameId);
    if (room) {
      room.delete(client.id);
      const connectionCount = room.size;
      
      this.logger.log(
        `Client ${client.id} (user: ${userId}) left game ${gameId}. ` +
        `Remaining connections: ${connectionCount}`
      );
      
      // Notify other clients
      client.to(`game:${gameId}`).emit('player_left_room', {
        gameId,
        userId,
        connectionCount,
      });
      
      // Clean up if room is empty
      if (connectionCount === 0) {
        this.cleanupGameRoom(gameId);
      }
    }
    
    this.socketToGame.delete(client.id);
    
    // Update spectator count
    await this.updateSpectatorCount(gameId);
    
    return {
      event: 'left_game',
      data: { gameId },
    };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('offer_draw')
  async handleOfferDraw(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; playerId: string },
  ) {
    const { gameId, playerId } = data;
    
    // Check if there's already an active draw offer for this game
    const existingOffer = await this.redisService.get(`draw_offer:${gameId}`);
    if (existingOffer) {
      return {
        event: 'draw_offer_error',
        data: { message: 'A draw offer is already pending' },
      };
    }

    // Store the draw offer in Redis with the offering player's ID
    await this.redisService.set(
      `draw_offer:${gameId}`,
      JSON.stringify({ offeringPlayerId: playerId, timestamp: Date.now() }),
      60, // 60 seconds TTL
    );

    // Notify the opponent about the draw offer
    this.server.to(`game:${gameId}`).emit('draw_offered', {
      gameId,
      offeringPlayerId: playerId,
      expiresAt: Date.now() + 60000, // 60 seconds from now
    });

    this.logger.log(`Player ${playerId} offered draw in game ${gameId}`);

    // Set up timeout to auto-decline after 60 seconds
    const timeoutId = setTimeout(async () => {
      const offer = await this.redisService.get(`draw_offer:${gameId}`);
      if (offer) {
        // Offer still exists, auto-decline it
        await this.redisService.delete(`draw_offer:${gameId}`);
        this.server.to(`game:${gameId}`).emit('draw_offer_expired', {
          gameId,
          offeringPlayerId: playerId,
        });
        this.logger.log(`Draw offer expired in game ${gameId}`);
      }
      this.drawOfferTimeouts.delete(gameId);
    }, 60000);

    this.drawOfferTimeouts.set(gameId, timeoutId);

    return {
      event: 'draw_offer_sent',
      data: { gameId, expiresAt: Date.now() + 60000 },
    };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('accept_draw')
  async handleAcceptDraw(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; playerId: string },
  ) {
    const { gameId, playerId } = data;

    // Check if there's an active draw offer
    const offerData = await this.redisService.get(`draw_offer:${gameId}`);
    if (!offerData) {
      return {
        event: 'draw_accept_error',
        data: { message: 'No active draw offer found' },
      };
    }

    const offer = JSON.parse(offerData);
    
    // Verify the accepting player is not the one who offered
    if (offer.offeringPlayerId === playerId) {
      return {
        event: 'draw_accept_error',
        data: { message: 'Cannot accept your own draw offer' },
      };
    }

    // Clear the timeout
    const timeoutId = this.drawOfferTimeouts.get(gameId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.drawOfferTimeouts.delete(gameId);
    }

    // Remove the draw offer from Redis
    await this.redisService.delete(`draw_offer:${gameId}`);

    // Notify both players that the draw was accepted
    this.server.to(`game:${gameId}`).emit('draw_accepted', {
      gameId,
      acceptingPlayerId: playerId,
      offeringPlayerId: offer.offeringPlayerId,
    });

    this.logger.log(`Draw accepted in game ${gameId} by player ${playerId}`);

    return {
      event: 'draw_accepted_confirmed',
      data: { gameId },
    };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('decline_draw')
  async handleDeclineDraw(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; playerId: string },
  ) {
    const { gameId, playerId } = data;

    // Check if there's an active draw offer
    const offerData = await this.redisService.get(`draw_offer:${gameId}`);
    if (!offerData) {
      return {
        event: 'draw_decline_error',
        data: { message: 'No active draw offer found' },
      };
    }

    const offer = JSON.parse(offerData);

    // Verify the declining player is not the one who offered
    if (offer.offeringPlayerId === playerId) {
      return {
        event: 'draw_decline_error',
        data: { message: 'Cannot decline your own draw offer' },
      };
    }

    // Clear the timeout
    const timeoutId = this.drawOfferTimeouts.get(gameId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.drawOfferTimeouts.delete(gameId);
    }

    // Remove the draw offer from Redis
    await this.redisService.delete(`draw_offer:${gameId}`);

    // Notify both players that the draw was declined
    this.server.to(`game:${gameId}`).emit('draw_declined', {
      gameId,
      decliningPlayerId: playerId,
      offeringPlayerId: offer.offeringPlayerId,
    });

    this.logger.log(`Draw declined in game ${gameId} by player ${playerId}`);

    return {
      event: 'draw_declined_confirmed',
      data: { gameId },
    };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('cancel_draw_offer')
  async handleCancelDrawOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; playerId: string },
  ) {
    const { gameId, playerId } = data;

    // Check if there's an active draw offer
    const offerData = await this.redisService.get(`draw_offer:${gameId}`);
    if (!offerData) {
      return {
        event: 'draw_cancel_error',
        data: { message: 'No active draw offer found' },
      };
    }

    const offer = JSON.parse(offerData);

    // Verify the canceling player is the one who offered
    if (offer.offeringPlayerId !== playerId) {
      return {
        event: 'draw_cancel_error',
        data: { message: 'Can only cancel your own draw offer' },
      };
    }

    // Clear the timeout
    const timeoutId = this.drawOfferTimeouts.get(gameId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.drawOfferTimeouts.delete(gameId);
    }

    // Remove the draw offer from Redis
    await this.redisService.delete(`draw_offer:${gameId}`);

    // Notify both players that the draw offer was cancelled
    this.server.to(`game:${gameId}`).emit('draw_offer_cancelled', {
      gameId,
      offeringPlayerId: playerId,
    });

    this.logger.log(`Draw offer cancelled in game ${gameId} by player ${playerId}`);

    return {
      event: 'draw_offer_cancelled_confirmed',
      data: { gameId },
    };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('make_move')
  async handleMakeMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      gameId: string;
      from: string;
      to: string;
      promotion?: string;
      clientSendTime?: number; // Optional client timestamp for latency tracking
    },
  ) {
    const { gameId, from, to, promotion, clientSendTime } = data;
    const userId = client.data.user?.id;
    const startTime = Date.now();
    const serverReceiveTime = startTime;

    try {
      // Validate input parameters
      if (!gameId || !from || !to) {
        return {
          event: 'move_error',
          data: { 
            message: 'Invalid move parameters',
            details: 'gameId, from, and to are required',
          },
        };
      }

      // Fetch the game from database
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          status: true,
          fenCurrent: true,
          whitePlayerId: true,
          blackPlayerId: true,
          moveCount: true,
          whiteTimeRemaining: true,
          blackTimeRemaining: true,
          incrementSeconds: true,
          pgn: true,
        },
      });

      if (!game) {
        this.logger.warn(`Move rejected: Game ${gameId} not found`);
        return {
          event: 'move_error',
          data: { 
            message: 'Game not found',
            code: 'GAME_NOT_FOUND',
          },
        };
      }

      // Validate game is active
      if (game.status !== 'ACTIVE') {
        this.logger.warn(`Move rejected: Game ${gameId} is not active (status: ${game.status})`);
        return {
          event: 'move_error',
          data: { 
            message: `Game is not active (status: ${game.status})`,
            code: 'GAME_NOT_ACTIVE',
            status: game.status,
          },
        };
      }

      // Validate user is a player in this game
      if (userId !== game.whitePlayerId && userId !== game.blackPlayerId) {
        this.logger.warn(`Move rejected: User ${userId} is not a player in game ${gameId}`);
        return {
          event: 'move_error',
          data: { 
            message: 'You are not a player in this game',
            code: 'NOT_A_PLAYER',
          },
        };
      }

      // Create chess instance with current position
      const chess = this.chessEngine.createGame(game.fenCurrent);

      // Determine which color the user is playing
      const userColor = userId === game.whitePlayerId ? 'w' : 'b';
      const currentTurn = this.chessEngine.getTurn(chess);

      // Validate it's the user's turn
      if (currentTurn !== userColor) {
        const turnColor = currentTurn === 'w' ? 'white' : 'black';
        this.logger.warn(`Move rejected: Not player's turn in game ${gameId} (current turn: ${turnColor})`);
        return {
          event: 'move_error',
          data: { 
            message: `It is not your turn (current turn: ${turnColor})`,
            code: 'NOT_YOUR_TURN',
            currentTurn: turnColor,
          },
        };
      }

      // Validate the move is legal before attempting to make it
      if (!this.chessEngine.isValidMove(chess, from, to, promotion)) {
        const legalMoves = this.chessEngine.getLegalMoves(chess, from);
        const piece = chess.get(from as any);
        
        this.logger.warn(
          `Move rejected: Invalid move ${from}-${to} in game ${gameId}. ` +
          `Piece: ${piece ? piece.type : 'none'}, Legal moves from ${from}: ${legalMoves.length}`
        );
        
        return {
          event: 'move_error',
          data: { 
            message: `Invalid move: ${from} to ${to}`,
            code: 'INVALID_MOVE',
            from,
            to,
            promotion,
            details: piece 
              ? `${piece.color === 'w' ? 'White' : 'Black'} ${piece.type} cannot move from ${from} to ${to}`
              : `No piece at ${from}`,
          },
        };
      }

      // Make the move (we know it's valid now)
      const move = this.chessEngine.makeMove(chess, from, to, promotion);

      if (!move) {
        // This shouldn't happen since we validated above, but handle it anyway
        this.logger.error(`Unexpected: Move validation passed but makeMove failed for ${from}-${to} in game ${gameId}`);
        return {
          event: 'move_error',
          data: { 
            message: 'Failed to execute move',
            code: 'MOVE_EXECUTION_FAILED',
          },
        };
      }

      // Get updated game state
      const newFen = this.chessEngine.getFen(chess);
      const newMoveCount = game.moveCount + 1;
      const isCheck = this.chessEngine.isCheck(chess);
      const isCheckmate = this.chessEngine.isCheckmate(chess);
      const isStalemate = this.chessEngine.isStalemate(chess);
      const isDraw = this.chessEngine.isDraw(chess);
      const isGameOver = this.chessEngine.isGameOver(chess);

      // Calculate time taken for this move (Requirement 5.6)
      const currentTime = Date.now();
      const turnStartTimeKey = `game:${gameId}:turn_start_time`;
      const turnStartTimeStr = await this.redisService.get(turnStartTimeKey);
      const turnStartTime = turnStartTimeStr ? parseInt(turnStartTimeStr, 10) : currentTime;
      const timeTakenMs = currentTime - turnStartTime;

      // Calculate time increment (Requirement 5.6)
      const timeIncrement = game.incrementSeconds * 1000; // Convert to milliseconds

      // Update time remaining for the player who just moved
      // Subtract time taken, then add increment
      let whiteTimeRemaining = game.whiteTimeRemaining;
      let blackTimeRemaining = game.blackTimeRemaining;

      if (userColor === 'w') {
        // Subtract time taken from white's clock, then add increment
        whiteTimeRemaining = Math.max(0, (whiteTimeRemaining || 0) - timeTakenMs) + timeIncrement;
      } else {
        // Subtract time taken from black's clock, then add increment
        blackTimeRemaining = Math.max(0, (blackTimeRemaining || 0) - timeTakenMs) + timeIncrement;
      }

      // Store the turn start time for the next player
      await this.redisService.set(turnStartTimeKey, currentTime.toString(), 3600); // 1 hour TTL

      // Determine game result if game is over
      let result = null;
      let terminationReason = null;

      if (isCheckmate) {
        result = userColor === 'w' ? 'WHITE_WIN' : 'BLACK_WIN';
        terminationReason = 'checkmate';
      } else if (isStalemate) {
        result = 'DRAW';
        terminationReason = 'stalemate';
      } else if (isDraw) {
        result = 'DRAW';
        if (this.chessEngine.isInsufficientMaterial(chess)) {
          terminationReason = 'insufficient_material';
        } else if (this.chessEngine.isThreefoldRepetition(chess)) {
          terminationReason = 'threefold_repetition';
        } else {
          terminationReason = 'fifty_move_rule';
        }
      }

      // Update game in database
      const updatedGame = await this.prisma.game.update({
        where: { id: gameId },
        data: {
          fenCurrent: newFen,
          moveCount: newMoveCount,
          whiteTimeRemaining,
          blackTimeRemaining,
          status: isGameOver ? 'COMPLETED' : 'ACTIVE',
          result,
          terminationReason,
          completedAt: isGameOver ? new Date() : undefined,
          pgn: this.chessEngine.getPgn(chess),
        },
      });

      // Create game move record with actual time taken (Requirement 5.6)
      await this.prisma.gameMove.create({
        data: {
          gameId,
          moveNumber: Math.floor(newMoveCount / 2) + (newMoveCount % 2),
          color: userColor === 'w' ? 'white' : 'black',
          san: move.san,
          uci: `${move.from}${move.to}${move.promotion || ''}`,
          fenAfter: newFen,
          timeTakenMs, // Actual time taken for this move
          timeRemainingMs: userColor === 'w' ? whiteTimeRemaining : blackTimeRemaining,
          isCheck,
          isCheckmate,
          isCapture: move.captured !== undefined,
          isCastling: move.flags.includes('k') || move.flags.includes('q'),
          isEnPassant: move.flags.includes('e'),
          isPromotion: move.promotion !== undefined,
          promotionPiece: move.promotion,
        },
      });

      // Track move time for anti-cheat detection (Requirement 24.10)
      await this.antiCheatService.trackMoveTime(
        gameId,
        userId,
        Math.floor(newMoveCount / 2) + (newMoveCount % 2),
        timeTakenMs,
        newFen,
      );

      // Calculate response time (should be < 100ms per requirement 6.9)
      const validationEndTime = Date.now();
      const validationTime = validationEndTime - startTime;
      
      // Broadcast the move to all clients in the game room using optimized payload
      const broadcastStartTime = Date.now();
      this.server.to(`game:${gameId}`).emit('move_made', {
        g: gameId,
        m: move.san,
        f: move.from,
        t: move.to,
        p: move.promotion,
        fen: newFen,
        mc: newMoveCount,
        ch: isCheck || undefined,
        cm: isCheckmate || undefined,
        wt: whiteTimeRemaining,
        bt: blackTimeRemaining,
        tt: timeTakenMs, // Time taken for this move
        inc: timeIncrement, // Increment added
        pid: userId,
        ts: broadcastStartTime,
      });
      const broadcastEndTime = Date.now();
      const broadcastTime = broadcastEndTime - broadcastStartTime;
      
      const totalServerTime = broadcastEndTime - startTime;

      this.logger.log(
        `Move made in game ${gameId}: ${move.san} by player ${userId} ` +
        `(time taken: ${timeTakenMs}ms, increment: ${timeIncrement}ms, ` +
        `validation: ${validationTime}ms, broadcast: ${broadcastTime}ms, total: ${totalServerTime}ms)`,
      );

      // Track latency for monitoring
      this.latencyTracker.trackMoveLatency(
        {
          clientSendTime,
          serverReceiveTime,
          validationTime,
          broadcastTime,
          totalServerTime,
        },
        gameId,
      );

      // If game is over, handle game end
      if (isGameOver) {
        await this.handleGameEnd(gameId, result!, terminationReason!);
      } else {
        // Update clock state for next turn
        await this.handleUpdateClock(client, {
          gameId,
          whiteTimeRemaining,
          blackTimeRemaining,
          currentTurn: userColor === 'w' ? 'black' : 'white',
        });
      }

      return {
        event: 'move_success',
        data: {
          gameId,
          move: move.san,
          fen: newFen,
          latency: {
            clientSendTime,
            serverReceiveTime,
            validationTime,
            broadcastTime,
            totalServerTime,
          },
        },
      };
    } catch (error) {
      this.logger.error(`Error making move in game ${gameId}: ${error.message}`, error.stack);
      return {
        event: 'move_error',
        data: { 
          message: 'Internal server error while processing move',
          code: 'INTERNAL_ERROR',
        },
      };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('resign')
  async handleResign(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    const { gameId } = data;
    const userId = client.data.user?.id;

    try {
      // Fetch the game from database
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          status: true,
          whitePlayerId: true,
          blackPlayerId: true,
        },
      });

      if (!game) {
        return {
          event: 'resign_error',
          data: { message: 'Game not found' },
        };
      }

      // Validate game is active
      if (game.status !== 'ACTIVE') {
        return {
          event: 'resign_error',
          data: { message: 'Game is not active' },
        };
      }

      // Validate user is a player in this game
      if (userId !== game.whitePlayerId && userId !== game.blackPlayerId) {
        return {
          event: 'resign_error',
          data: { message: 'You are not a player in this game' },
        };
      }

      // Determine the result based on who resigned
      const resigningColor = userId === game.whitePlayerId ? 'white' : 'black';
      const result = resigningColor === 'white' ? 'BLACK_WIN' : 'WHITE_WIN';

      // Update game in database
      await this.prisma.game.update({
        where: { id: gameId },
        data: {
          status: 'COMPLETED',
          result,
          terminationReason: 'resignation',
          completedAt: new Date(),
        },
      });

      // Broadcast resignation to all clients in the game room
      this.server.to(`game:${gameId}`).emit('player_resigned', {
        gameId,
        resigningPlayerId: userId,
        resigningColor,
        result,
      });

      this.logger.log(
        `Player ${userId} (${resigningColor}) resigned in game ${gameId}`,
      );

      // Handle game end
      await this.handleGameEnd(gameId, result, 'resignation');

      return {
        event: 'resign_success',
        data: { gameId, result },
      };
    } catch (error) {
      this.logger.error(`Error handling resignation in game ${gameId}: ${error.message}`);
      return {
        event: 'resign_error',
        data: { message: 'Failed to resign' },
      };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('register_player')
  async handleRegisterPlayer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string; playerId: string },
  ) {
    const { gameId, playerId } = data;
    
    // Store the mapping of playerId to socketId
    this.playerSockets.set(playerId, client.id);
    
    // Check if player was previously disconnected and clear timeout
    const disconnectKey = `disconnect:${gameId}:${playerId}`;
    const disconnectTimeoutId = this.disconnectionTimeouts.get(disconnectKey);
    
    if (disconnectTimeoutId) {
      clearTimeout(disconnectTimeoutId);
      this.disconnectionTimeouts.delete(disconnectKey);
      
      // Resume the clock
      await this.resumePlayerClock(gameId, playerId);
      
      // Notify opponent of reconnection
      this.server.to(`game:${gameId}`).emit('player_reconnected', {
        gameId,
        playerId,
      });
      
      this.logger.log(`Player ${playerId} reconnected to game ${gameId}`);
    }
    
    return {
      event: 'player_registered',
      data: { gameId, playerId },
    };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('request_game_state')
  async handleRequestGameState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    const { gameId } = data;
    const userId = client.data.user?.id;

    try {
      // Fetch complete game state from database (authoritative source)
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        include: {
          whitePlayer: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          blackPlayer: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          moves: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!game) {
        this.logger.warn(`State request rejected: Game ${gameId} not found`);
        return {
          event: 'game_state_error',
          data: { 
            message: 'Game not found',
            code: 'GAME_NOT_FOUND',
          },
        };
      }

      // Get clock state from Redis if game is active
      let clockState = null;
      if (game.status === 'ACTIVE') {
        const clockData = await this.redisService.get(`clock:${gameId}`);
        if (clockData) {
          clockState = JSON.parse(clockData);
        }
      }

      // Build complete game state response
      const gameState = {
        id: game.id,
        status: game.status,
        result: game.result,
        terminationReason: game.terminationReason,
        whitePlayer: game.whitePlayer,
        blackPlayer: game.blackPlayer,
        timeControl: game.timeControl,
        initialTimeMinutes: game.initialTimeMinutes,
        incrementSeconds: game.incrementSeconds,
        isRated: game.isRated,
        fenCurrent: game.fenCurrent,
        pgn: game.pgn,
        moveCount: game.moveCount,
        whiteTimeRemaining: clockState?.whiteTimeRemaining ?? game.whiteTimeRemaining,
        blackTimeRemaining: clockState?.blackTimeRemaining ?? game.blackTimeRemaining,
        currentTurn: clockState?.currentTurn ?? (game.moveCount % 2 === 0 ? 'white' : 'black'),
        isPaused: clockState?.isPaused ?? false,
        moves: game.moves.map(move => ({
          moveNumber: move.moveNumber,
          color: move.color,
          san: move.san,
          uci: move.uci,
          fenAfter: move.fenAfter,
          timeTakenMs: move.timeTakenMs,
          timeRemainingMs: move.timeRemainingMs,
          isCheck: move.isCheck,
          isCheckmate: move.isCheckmate,
          isCapture: move.isCapture,
          isCastling: move.isCastling,
          isEnPassant: move.isEnPassant,
          isPromotion: move.isPromotion,
          promotionPiece: move.promotionPiece,
        })),
        spectatorCount: game.spectatorCount,
        startedAt: game.startedAt,
        completedAt: game.completedAt,
        serverTimestamp: Date.now(),
      };

      this.logger.log(`Sent complete game state for ${gameId} to client ${client.id} (user: ${userId})`);

      return {
        event: 'game_state',
        data: gameState,
      };
    } catch (error) {
      this.logger.error(`Error fetching game state for ${gameId}: ${error.message}`, error.stack);
      return {
        event: 'game_state_error',
        data: { 
          message: 'Failed to fetch game state',
          code: 'INTERNAL_ERROR',
        },
      };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('sync_game_state')
  async handleSyncGameState(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { 
      gameId: string;
      clientState: {
        moveCount: number;
        fenCurrent: string;
        whiteTimeRemaining?: number;
        blackTimeRemaining?: number;
      };
    },
  ) {
    const { gameId, clientState } = data;
    const userId = client.data.user?.id;

    try {
      // Fetch authoritative server state
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          status: true,
          fenCurrent: true,
          moveCount: true,
          whiteTimeRemaining: true,
          blackTimeRemaining: true,
          whitePlayerId: true,
          blackPlayerId: true,
        },
      });

      if (!game) {
        return {
          event: 'sync_error',
          data: { 
            message: 'Game not found',
            code: 'GAME_NOT_FOUND',
          },
        };
      }

      // Get current clock state from Redis for active games
      let serverClockState = null;
      if (game.status === 'ACTIVE') {
        const clockData = await this.redisService.get(`clock:${gameId}`);
        if (clockData) {
          serverClockState = JSON.parse(clockData);
        }
      }

      // Detect state conflicts
      const conflicts = [];
      
      if (clientState.moveCount !== game.moveCount) {
        conflicts.push({
          field: 'moveCount',
          clientValue: clientState.moveCount,
          serverValue: game.moveCount,
        });
      }

      if (clientState.fenCurrent !== game.fenCurrent) {
        conflicts.push({
          field: 'fenCurrent',
          clientValue: clientState.fenCurrent,
          serverValue: game.fenCurrent,
        });
      }

      // Check clock conflicts (allow small drift up to 1 second)
      const clockDriftThreshold = 1000; // 1 second in milliseconds
      
      if (serverClockState) {
        if (clientState.whiteTimeRemaining !== undefined) {
          const whiteDrift = Math.abs(clientState.whiteTimeRemaining - serverClockState.whiteTimeRemaining);
          if (whiteDrift > clockDriftThreshold) {
            conflicts.push({
              field: 'whiteTimeRemaining',
              clientValue: clientState.whiteTimeRemaining,
              serverValue: serverClockState.whiteTimeRemaining,
              drift: whiteDrift,
            });
          }
        }

        if (clientState.blackTimeRemaining !== undefined) {
          const blackDrift = Math.abs(clientState.blackTimeRemaining - serverClockState.blackTimeRemaining);
          if (blackDrift > clockDriftThreshold) {
            conflicts.push({
              field: 'blackTimeRemaining',
              clientValue: clientState.blackTimeRemaining,
              serverValue: serverClockState.blackTimeRemaining,
              drift: blackDrift,
            });
          }
        }
      }

      // If conflicts detected, log and return authoritative state
      if (conflicts.length > 0) {
        this.logger.warn(
          `State conflict detected in game ${gameId} for client ${client.id} (user: ${userId}). ` +
          `Conflicts: ${JSON.stringify(conflicts)}`
        );

        // Return authoritative server state to resolve conflicts
        return {
          event: 'state_conflict_resolved',
          data: {
            conflicts,
            authoritativeState: {
              moveCount: game.moveCount,
              fenCurrent: game.fenCurrent,
              whiteTimeRemaining: serverClockState?.whiteTimeRemaining ?? game.whiteTimeRemaining,
              blackTimeRemaining: serverClockState?.blackTimeRemaining ?? game.blackTimeRemaining,
              currentTurn: serverClockState?.currentTurn ?? (game.moveCount % 2 === 0 ? 'white' : 'black'),
              serverTimestamp: Date.now(),
            },
            message: 'Client state was out of sync. Please update to server state.',
          },
        };
      }

      // No conflicts - client is in sync
      this.logger.log(`Client ${client.id} (user: ${userId}) is in sync with game ${gameId}`);
      
      return {
        event: 'state_synced',
        data: {
          message: 'Client state is synchronized with server',
          serverTimestamp: Date.now(),
        },
      };
    } catch (error) {
      this.logger.error(`Error syncing game state for ${gameId}: ${error.message}`, error.stack);
      return {
        event: 'sync_error',
        data: { 
          message: 'Failed to sync game state',
          code: 'INTERNAL_ERROR',
        },
      };
    }
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('start_clock')
  async handleStartClock(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      gameId: string;
      whiteTimeRemaining: number;
      blackTimeRemaining: number;
      currentTurn: 'white' | 'black';
    },
  ) {
    const { gameId, whiteTimeRemaining, blackTimeRemaining, currentTurn } = data;
    
    // Store initial clock state in Redis
    await this.redisService.set(
      `clock:${gameId}`,
      JSON.stringify({
        whiteTimeRemaining,
        blackTimeRemaining,
        currentTurn,
        lastUpdate: Date.now(),
        isPaused: false,
        tickCount: 0,
      }),
    );
    
    // Initialize turn start time for time tracking (Requirement 5.6)
    const turnStartTimeKey = `game:${gameId}:turn_start_time`;
    await this.redisService.set(turnStartTimeKey, Date.now().toString(), 3600); // 1 hour TTL
    
    // Start the clock interval
    this.startClockInterval(gameId);
    
    this.logger.log(`Clock started for game ${gameId}`);
    
    return {
      event: 'clock_started',
      data: { gameId },
    };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('update_clock')
  async handleUpdateClock(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      gameId: string;
      whiteTimeRemaining: number;
      blackTimeRemaining: number;
      currentTurn: 'white' | 'black';
    },
  ) {
    const { gameId, whiteTimeRemaining, blackTimeRemaining, currentTurn } = data;
    
    // Update clock state in Redis
    const clockData = await this.redisService.get(`clock:${gameId}`);
    if (clockData) {
      const clock = JSON.parse(clockData);
      await this.redisService.set(
        `clock:${gameId}`,
        JSON.stringify({
          ...clock,
          whiteTimeRemaining,
          blackTimeRemaining,
          currentTurn,
          lastUpdate: Date.now(),
        }),
      );
    }
    
    return {
      event: 'clock_updated',
      data: { gameId },
    };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('stop_clock')
  async handleStopClock(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameId: string },
  ) {
    const { gameId } = data;
    
    // Stop the clock interval
    this.stopClockInterval(gameId);
    
    // Remove clock data from Redis
    await this.redisService.delete(`clock:${gameId}`);
    
    this.logger.log(`Clock stopped for game ${gameId}`);
    
    return {
      event: 'clock_stopped',
      data: { gameId },
    };
  }

  private async handlePlayerDisconnection(playerId: string, client: Socket) {
    // Find the game this player is in
    const rooms = Array.from(client.rooms);
    const gameRoom = rooms.find(room => room.startsWith('game:'));
    
    if (!gameRoom) {
      return;
    }
    
    const gameId = gameRoom.replace('game:', '');
    
    // Pause the player's clock
    await this.pausePlayerClock(gameId, playerId);
    
    // Notify opponent within 3 seconds (immediately)
    this.server.to(`game:${gameId}`).emit('player_disconnected', {
      gameId,
      playerId,
      pausedAt: Date.now(),
    });
    
    this.logger.log(`Player ${playerId} disconnected from game ${gameId}, clock paused`);
    
    // Set a 60-second timeout to resume the clock if player doesn't reconnect
    const disconnectKey = `disconnect:${gameId}:${playerId}`;
    const timeoutId = setTimeout(async () => {
      // Check if player has reconnected
      const currentSocketId = this.playerSockets.get(playerId);
      if (!currentSocketId || currentSocketId === client.id) {
        // Player hasn't reconnected, resume the clock
        await this.resumePlayerClock(gameId, playerId);
        
        this.server.to(`game:${gameId}`).emit('clock_resumed_after_disconnect', {
          gameId,
          playerId,
          resumedAt: Date.now(),
        });
        
        this.logger.log(`Clock resumed for player ${playerId} in game ${gameId} after 60s timeout`);
      }
      
      this.disconnectionTimeouts.delete(disconnectKey);
    }, 60000); // 60 seconds
    
    this.disconnectionTimeouts.set(disconnectKey, timeoutId);
  }

  private async pausePlayerClock(gameId: string, playerId: string) {
    const clockData = await this.redisService.get(`clock:${gameId}`);
    if (!clockData) {
      return;
    }
    
    const clock = JSON.parse(clockData);
    
    // Mark the clock as paused for this player
    await this.redisService.set(
      `clock:${gameId}`,
      JSON.stringify({
        ...clock,
        isPaused: true,
        pausedPlayerId: playerId,
        pausedAt: Date.now(),
      }),
    );
  }

  private async resumePlayerClock(gameId: string, playerId: string) {
    const clockData = await this.redisService.get(`clock:${gameId}`);
    if (!clockData) {
      return;
    }
    
    const clock = JSON.parse(clockData);
    
    // Only resume if this player's clock was paused
    if (clock.isPaused && clock.pausedPlayerId === playerId) {
      await this.redisService.set(
        `clock:${gameId}`,
        JSON.stringify({
          ...clock,
          isPaused: false,
          pausedPlayerId: null,
          pausedAt: null,
          lastUpdate: Date.now(),
        }),
      );
    }
  }

  private startClockInterval(gameId: string) {
    // Clear any existing interval
    this.stopClockInterval(gameId);
    
    // Create a new interval that ticks every 100ms for accuracy
    const intervalId = setInterval(async () => {
      await this.tickClock(gameId);
    }, 100);
    
    this.clockIntervals.set(gameId, intervalId);
  }

  private stopClockInterval(gameId: string) {
    const intervalId = this.clockIntervals.get(gameId);
    if (intervalId) {
      clearInterval(intervalId);
      this.clockIntervals.delete(gameId);
    }
  }

  private async tickClock(gameId: string) {
    const clockData = await this.redisService.get(`clock:${gameId}`);
    if (!clockData) {
      this.stopClockInterval(gameId);
      return;
    }
    
    const clock = JSON.parse(clockData);
    
    // Don't tick if paused
    if (clock.isPaused) {
      return;
    }
    
    const now = Date.now();
    const elapsed = now - clock.lastUpdate;
    
    // Update the current player's time
    let whiteTimeRemaining = clock.whiteTimeRemaining;
    let blackTimeRemaining = clock.blackTimeRemaining;
    
    if (clock.currentTurn === 'white') {
      whiteTimeRemaining = Math.max(0, whiteTimeRemaining - elapsed);
    } else {
      blackTimeRemaining = Math.max(0, blackTimeRemaining - elapsed);
    }
    
    // Check for timeout
    if (whiteTimeRemaining === 0) {
      await this.handleTimeout(gameId, 'white');
      return;
    }
    
    if (blackTimeRemaining === 0) {
      await this.handleTimeout(gameId, 'black');
      return;
    }
    
    // Increment tick count
    const tickCount = (clock.tickCount || 0) + 1;
    
    // Update clock state in Redis with new times and tick count
    await this.redisService.set(
      `clock:${gameId}`,
      JSON.stringify({
        ...clock,
        whiteTimeRemaining,
        blackTimeRemaining,
        lastUpdate: now,
        tickCount,
      }),
    );
    
    // Broadcast clock sync every second (every 10 ticks)
    // Requirement 5.7: Synchronize clock times with maximum 100ms drift
    if (tickCount % 10 === 0) {
      this.server.to(`game:${gameId}`).emit('clock_sync', {
        gameId,
        whiteTimeRemaining,
        blackTimeRemaining,
        currentTurn: clock.currentTurn,
        serverTimestamp: now,
      });
    }
    
    // Periodic full state sync every 30 seconds (every 300 ticks) to prevent drift
    // This ensures clients stay synchronized even if they miss individual updates
    if (tickCount % 300 === 0) {
      await this.broadcastGameState(gameId);
    }
  }

  private async handleTimeout(gameId: string, timeoutPlayer: 'white' | 'black') {
    // Stop the clock
    this.stopClockInterval(gameId);
    
    // Determine the winner (opponent of the player who timed out)
    const winner = timeoutPlayer === 'white' ? 'black' : 'white';
    const result = winner === 'white' ? 'white_win' : 'black_win';
    
    // Notify all clients in the game room
    this.server.to(`game:${gameId}`).emit('game_ended', {
      gameId,
      result,
      terminationReason: 'timeout',
      timeoutPlayer,
      winner,
    });
    
    this.logger.log(`Game ${gameId} ended by timeout. ${timeoutPlayer} ran out of time. Winner: ${winner}`);
    
    // Clean up
    await this.redisService.delete(`clock:${gameId}`);
    
    // Clean up game room
    this.cleanupGameRoom(gameId);
  }

  /**
   * Clean up all resources associated with a game room
   * Called when game ends or room becomes empty
   */
  private cleanupGameRoom(gameId: string) {
    this.logger.log(`Cleaning up game room ${gameId}`);
    
    // Clear draw offer timeout
    const drawTimeout = this.drawOfferTimeouts.get(gameId);
    if (drawTimeout) {
      clearTimeout(drawTimeout);
      this.drawOfferTimeouts.delete(gameId);
    }
    
    // Clear clock interval
    this.stopClockInterval(gameId);
    
    // Clear disconnection timeouts for this game
    const disconnectKeys = Array.from(this.disconnectionTimeouts.keys())
      .filter(key => key.startsWith(`disconnect:${gameId}:`));
    
    for (const key of disconnectKeys) {
      const timeout = this.disconnectionTimeouts.get(key);
      if (timeout) {
        clearTimeout(timeout);
        this.disconnectionTimeouts.delete(key);
      }
    }
    
    // Remove game room tracking
    this.gameRooms.delete(gameId);
    
    // Remove socket-to-game mappings for this game
    for (const [socketId, mappedGameId] of this.socketToGame.entries()) {
      if (mappedGameId === gameId) {
        this.socketToGame.delete(socketId);
      }
    }
    
    // Clean up Redis data
    this.redisService.delete(`clock:${gameId}`).catch(err => {
      this.logger.error(`Failed to delete clock data for game ${gameId}: ${err.message}`);
    });
    
    this.redisService.delete(`draw_offer:${gameId}`).catch(err => {
      this.logger.error(`Failed to delete draw offer for game ${gameId}: ${err.message}`);
    });
    
    this.logger.log(`Game room ${gameId} cleanup complete`);
  }

  /**
   * Update spectator count in database based on active connections
   */
  private async updateSpectatorCount(gameId: string) {
    try {
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        select: {
          whitePlayerId: true,
          blackPlayerId: true,
        },
      });
      
      if (!game) {
        return;
      }
      
      // Count connections that are not players
      const room = this.gameRooms.get(gameId);
      if (!room) {
        // No connections, set spectator count to 0
        await this.prisma.game.update({
          where: { id: gameId },
          data: { spectatorCount: 0 },
        });
        return;
      }
      
      // Get all sockets in the room and check if they're players
      let spectatorCount = 0;
      for (const socketId of room) {
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          const userId = socket.data.user?.id;
          const isPlayer = userId && (game.whitePlayerId === userId || game.blackPlayerId === userId);
          if (!isPlayer) {
            spectatorCount++;
          }
        }
      }
      
      // Update database
      await this.prisma.game.update({
        where: { id: gameId },
        data: { spectatorCount },
      });
      
      // Broadcast updated spectator count
      this.server.to(`game:${gameId}`).emit('spectator_count_updated', {
        gameId,
        spectatorCount,
      });
      
    } catch (error) {
      this.logger.error(`Failed to update spectator count for game ${gameId}: ${error.message}`);
    }
  }

  /**
   * Get active connection count for a game
   */
  getGameConnectionCount(gameId: string): number {
    const room = this.gameRooms.get(gameId);
    return room ? room.size : 0;
  }

  /**
   * Check if a game room exists and has active connections
   */
  isGameRoomActive(gameId: string): boolean {
    const room = this.gameRooms.get(gameId);
    return room ? room.size > 0 : false;
  }

  /**
   * Handle game end - clean up room, notify all clients, and update tournament standings if applicable
   * Requirements: 12.1
   * Can be called from other services when a game ends
   */
  async handleGameEnd(gameId: string, result: string, terminationReason: string) {
    this.logger.log(`Handling game end for ${gameId}: ${result} by ${terminationReason}`);
    
    // Get game details to check if it's a tournament game
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      select: {
        id: true,
        tournamentId: true,
      },
    });
    
    // Notify all clients in the game room
    this.server.to(`game:${gameId}`).emit('game_ended', {
      gameId,
      result,
      terminationReason,
    });
    
    // If this is a tournament game, update standings and broadcast
    if (game?.tournamentId) {
      try {
        this.logger.log(`Game ${gameId} is part of tournament ${game.tournamentId}, updating standings`);
        
        // Calculate updated standings
        const standings = await this.standingsService.calculateStandings(game.tournamentId);
        
        // Broadcast standings update to all tournament participants
        this.tournamentGateway.broadcastStandingsUpdate(game.tournamentId, standings);
        
        this.logger.log(`Successfully updated and broadcast standings for tournament ${game.tournamentId}`);
      } catch (error) {
        this.logger.error(
          `Failed to update standings for tournament ${game.tournamentId}: ${error.message}`,
          error.stack,
        );
        // Don't fail the game end if standings update fails
      }
    }
    
    // Clean up the game room
    this.cleanupGameRoom(gameId);

    // Perform statistical analysis for anti-cheat detection (Requirement 24.13)
    await this.antiCheatService.analyzeMovePatternsForGame(gameId);
  }

  /**
   * Broadcast complete game state to all clients in a game room
   * Used for periodic synchronization to prevent drift
   */
  private async broadcastGameState(gameId: string) {
    try {
      // Fetch authoritative game state from database
      const game = await this.prisma.game.findUnique({
        where: { id: gameId },
        select: {
          id: true,
          status: true,
          fenCurrent: true,
          moveCount: true,
          whiteTimeRemaining: true,
          blackTimeRemaining: true,
          result: true,
          terminationReason: true,
        },
      });

      if (!game) {
        this.logger.warn(`Cannot broadcast state for non-existent game ${gameId}`);
        return;
      }

      // Get current clock state from Redis
      let clockState = null;
      if (game.status === 'ACTIVE') {
        const clockData = await this.redisService.get(`clock:${gameId}`);
        if (clockData) {
          clockState = JSON.parse(clockData);
        }
      }

      // Broadcast state sync to all clients in the room
      this.server.to(`game:${gameId}`).emit('periodic_state_sync', {
        gameId,
        moveCount: game.moveCount,
        fenCurrent: game.fenCurrent,
        whiteTimeRemaining: clockState?.whiteTimeRemaining ?? game.whiteTimeRemaining,
        blackTimeRemaining: clockState?.blackTimeRemaining ?? game.blackTimeRemaining,
        currentTurn: clockState?.currentTurn ?? (game.moveCount % 2 === 0 ? 'white' : 'black'),
        status: game.status,
        result: game.result,
        terminationReason: game.terminationReason,
        serverTimestamp: Date.now(),
      });

      this.logger.log(`Broadcasted periodic state sync for game ${gameId}`);
    } catch (error) {
      this.logger.error(`Error broadcasting game state for ${gameId}: ${error.message}`);
    }
  }

  /**
   * Get latency statistics for monitoring
   * Task 14.5: Latency monitoring
   */
  @SubscribeMessage('get_latency_stats')
  getLatencyStatistics() {
    return {
      event: 'latency_stats',
      data: this.latencyTracker.getStatistics(),
    };
  }

  /**
   * Get latency health status
   * Task 14.5: Latency monitoring
   */
  @SubscribeMessage('get_latency_health')
  getLatencyHealth() {
    return {
      event: 'latency_health',
      data: this.latencyTracker.getHealthStatus(),
    };
  }

  /**
   * Track browser tab focus loss
   * Requirement 24.11: Detect when a player's browser tab loses focus during games
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('track_focus_loss')
  async handleTrackFocusLoss(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      gameId: string;
      focusLostAt: string;
      focusRegainedAt: string;
    },
  ) {
    const userId = client.data.user?.id;
    const { gameId, focusLostAt, focusRegainedAt } = data;

    try {
      if (!gameId || !focusLostAt || !focusRegainedAt) {
        return {
          event: 'error',
          data: { message: 'Invalid focus loss data' },
        };
      }

      await this.antiCheatService.trackFocusLoss(
        gameId,
        userId,
        new Date(focusLostAt),
        new Date(focusRegainedAt),
      );

      return {
        event: 'focus_loss_tracked',
        data: { success: true },
      };
    } catch (error) {
      this.logger.error(`Error tracking focus loss: ${error.message}`, error.stack);
      return {
        event: 'error',
        data: { message: 'Failed to track focus loss' },
      };
    }
  }

  /**
   * Detect chess analysis browser extensions
   * Requirement 24.12: Detect browser extensions that might assist with chess analysis
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('detect_extension')
  async handleDetectExtension(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      gameId: string;
      extensionName?: string;
      extensionId?: string;
      detectionMethod: string;
    },
  ) {
    const userId = client.data.user?.id;
    const { gameId, extensionName, extensionId, detectionMethod } = data;

    try {
      if (!gameId || !detectionMethod) {
        return {
          event: 'error',
          data: { message: 'Invalid extension detection data' },
        };
      }

      await this.antiCheatService.detectBrowserExtension(gameId, userId, {
        extensionName,
        extensionId,
        detectionMethod,
      });

      return {
        event: 'extension_detected',
        data: { success: true },
      };
    } catch (error) {
      this.logger.error(`Error detecting extension: ${error.message}`, error.stack);
      return {
        event: 'error',
        data: { message: 'Failed to detect extension' },
      };
    }
  }
}

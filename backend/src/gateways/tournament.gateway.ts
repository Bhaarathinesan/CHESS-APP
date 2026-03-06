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
import { Logger, UseGuards } from '@nestjs/common';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { PlayerStanding } from '../tournaments/standings.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  namespace: '/tournament',
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class TournamentGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TournamentGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      // Extract and verify JWT token
      const token = this.extractTokenFromHandshake(client);
      if (!token) {
        this.logger.warn(`Connection rejected: No token provided (${client.id})`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('auth.jwt.secret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          username: true,
          displayName: true,
          isBanned: true,
        },
      });

      if (!user || user.isBanned) {
        this.logger.warn(`Connection rejected: Invalid user (${client.id})`);
        client.emit('error', { message: 'Authentication failed' });
        client.disconnect();
        return;
      }

      client.data.user = user;

      this.logger.log(
        `Client connected to /tournament: ${client.id} (user: ${user.username})`,
      );
    } catch (error) {
      this.logger.error(`Connection authentication failed: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const userId = client.data.user?.id;
    if (userId) {
      this.logger.log(
        `Client disconnected from /tournament: ${client.id} (user: ${userId})`,
      );
    } else {
      this.logger.log(`Client disconnected from /tournament: ${client.id}`);
    }
  }

  private extractTokenFromHandshake(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (token && typeof token === 'string') {
      return token;
    }
    return null;
  }

  /**
   * Handle join_tournament event
   * Requirements: 10.4
   * @param client Socket client
   * @param data Tournament ID
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_tournament')
  async handleJoinTournament(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tournamentId: string },
  ) {
    const userId = client.data.user?.id;
    const { tournamentId } = data;

    try {
      // Verify user is registered for this tournament
      const participant = await this.prisma.tournamentPlayer.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId,
          },
        },
      });

      if (!participant) {
        client.emit('tournament_error', {
          message: 'You are not registered for this tournament',
        });
        return {
          event: 'tournament_error',
          data: { message: 'Not registered' },
        };
      }

      // Join tournament room
      client.join(`tournament:${tournamentId}`);
      
      this.logger.log(
        `User ${userId} joined tournament room ${tournamentId}`,
      );

      return {
        event: 'joined_tournament',
        data: { tournamentId },
      };
    } catch (error) {
      this.logger.error(
        `Failed to join tournament ${tournamentId} for user ${userId}: ${error.message}`,
      );
      client.emit('tournament_error', {
        message: 'Failed to join tournament',
      });
      return {
        event: 'tournament_error',
        data: { message: error.message },
      };
    }
  }

  /**
   * Handle leave_tournament event
   * @param client Socket client
   * @param data Tournament ID
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave_tournament')
  handleLeaveTournament(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tournamentId: string },
  ) {
    const userId = client.data.user?.id;
    const { tournamentId } = data;

    client.leave(`tournament:${tournamentId}`);
    
    this.logger.log(
      `User ${userId} left tournament room ${tournamentId}`,
    );

    return {
      event: 'left_tournament',
      data: { tournamentId },
    };
  }

  /**
   * Broadcast tournament_started event to all participants
   * Requirements: 10.5
   * @param tournamentId Tournament ID
   * @param tournament Tournament data
   * @param currentRound Current round number
   */
  async broadcastTournamentStarted(
    tournamentId: string,
    tournament: any,
    currentRound: number,
  ): Promise<void> {
    this.logger.log(
      `Broadcasting tournament_started for tournament ${tournamentId}`,
    );

    this.server.to(`tournament:${tournamentId}`).emit('tournament_started', {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        format: tournament.format,
        timeControl: tournament.timeControl,
        status: tournament.status,
        roundsTotal: tournament.roundsTotal,
      },
      currentRound,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast round_started event with pairings to all participants
   * Requirements: 10.6
   * @param tournamentId Tournament ID
   * @param roundNumber Round number
   * @param pairings Round pairings
   */
  async broadcastRoundStarted(
    tournamentId: string,
    roundNumber: number,
    pairings: any[],
  ): Promise<void> {
    this.logger.log(
      `Broadcasting round_started for tournament ${tournamentId}, round ${roundNumber} with ${pairings.length} pairings`,
    );

    // Format pairings for broadcast
    const formattedPairings = await Promise.all(
      pairings.map(async (pairing) => {
        const [whitePlayer, blackPlayer] = await Promise.all([
          pairing.whitePlayerId
            ? this.prisma.user.findUnique({
                where: { id: pairing.whitePlayerId },
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              })
            : null,
          pairing.blackPlayerId
            ? this.prisma.user.findUnique({
                where: { id: pairing.blackPlayerId },
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              })
            : null,
        ]);

        return {
          id: pairing.id,
          boardNumber: pairing.boardNumber,
          whitePlayer,
          blackPlayer,
          isBye: pairing.isBye,
          gameId: pairing.gameId,
        };
      }),
    );

    // Broadcast to all participants
    this.server.to(`tournament:${tournamentId}`).emit('round_started', {
      tournamentId,
      roundNumber,
      pairings: formattedPairings,
      timestamp: Date.now(),
    });

    // Send individual pairing announcements to each player
    for (const pairing of pairings) {
      if (pairing.whitePlayerId) {
        await this.broadcastPairingAnnounced(
          tournamentId,
          pairing.whitePlayerId,
          pairing,
          'white',
        );
      }
      if (pairing.blackPlayerId) {
        await this.broadcastPairingAnnounced(
          tournamentId,
          pairing.blackPlayerId,
          pairing,
          'black',
        );
      }
    }
  }

  /**
   * Broadcast pairing_announced event to individual player
   * Requirements: 10.7
   * @param tournamentId Tournament ID
   * @param userId User ID
   * @param pairing Pairing data
   * @param color Player's color
   */
  async broadcastPairingAnnounced(
    tournamentId: string,
    userId: string,
    pairing: any,
    color: 'white' | 'black',
  ): Promise<void> {
    try {
      // Get opponent ID
      const opponentId =
        color === 'white' ? pairing.blackPlayerId : pairing.whitePlayerId;

      if (!opponentId) {
        // Bye round
        this.logger.log(
          `User ${userId} has a bye in tournament ${tournamentId}`,
        );
        return;
      }

      // Fetch opponent details
      const opponent = await this.prisma.user.findUnique({
        where: { id: opponentId },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      });

      if (!opponent) {
        this.logger.error(
          `Opponent ${opponentId} not found for pairing announcement`,
        );
        return;
      }

      // Get user's socket connections
      const sockets = await this.server
        .in(`tournament:${tournamentId}`)
        .fetchSockets();
      
      const userSockets = sockets.filter(
        (socket) => socket.data.user?.id === userId,
      );

      // Send pairing announcement to user's sockets
      for (const socket of userSockets) {
        socket.emit('pairing_announced', {
          tournamentId,
          pairing: {
            id: pairing.id,
            boardNumber: pairing.boardNumber,
            roundNumber: pairing.roundNumber,
          },
          opponent,
          color,
          gameId: pairing.gameId,
          timestamp: Date.now(),
        });
      }

      this.logger.log(
        `Sent pairing announcement to user ${userId} (${color}) vs ${opponentId} in tournament ${tournamentId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to broadcast pairing announcement: ${error.message}`,
      );
    }
  }

  /**
   * Broadcast standings_updated event to all participants
   * Requirements: 12.1
   * @param tournamentId Tournament ID
   * @param standings Updated standings data
   */
  broadcastStandingsUpdate(
    tournamentId: string,
    standings: PlayerStanding[],
  ): void {
    this.logger.log(
      `Broadcasting standings_updated for tournament ${tournamentId} to ${standings.length} players`,
    );

    this.server.to(`tournament:${tournamentId}`).emit('standings_updated', {
      tournamentId,
      standings,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast tournament_completed event to all participants
   * Requirements: 10.7
   * @param tournamentId Tournament ID
   * @param finalStandings Final standings
   * @param winners Top 3 winners
   */
  async broadcastTournamentCompleted(
    tournamentId: string,
    finalStandings: PlayerStanding[],
    winners: any[],
  ): Promise<void> {
    this.logger.log(
      `Broadcasting tournament_completed for tournament ${tournamentId}`,
    );

    // Fetch winner details
    const winnerDetails = await Promise.all(
      winners.map(async (winner) => {
        const user = await this.prisma.user.findUnique({
          where: { id: winner.userId },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        });

        return {
          ...user,
          rank: winner.rank,
          score: winner.score,
        };
      }),
    );

    this.server.to(`tournament:${tournamentId}`).emit('tournament_completed', {
      tournamentId,
      finalStandings,
      winners: winnerDetails,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast tournament_cancelled event to all participants
   * Requirements: 10.9
   * @param tournamentId Tournament ID
   * @param reason Cancellation reason
   */
  broadcastTournamentCancelled(
    tournamentId: string,
    reason: string,
  ): void {
    this.logger.log(
      `Broadcasting tournament_cancelled for tournament ${tournamentId}: ${reason}`,
    );

    this.server.to(`tournament:${tournamentId}`).emit('tournament_cancelled', {
      tournamentId,
      reason,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast round_completed event to all participants
   * @param tournamentId Tournament ID
   * @param roundNumber Completed round number
   * @param standings Updated standings after round
   */
  async broadcastRoundCompleted(
    tournamentId: string,
    roundNumber: number,
    standings: PlayerStanding[],
  ): Promise<void> {
    this.logger.log(
      `Broadcasting round_completed for tournament ${tournamentId}, round ${roundNumber}`,
    );

    this.server.to(`tournament:${tournamentId}`).emit('round_completed', {
      tournamentId,
      roundNumber,
      standings,
      timestamp: Date.now(),
    });
  }
}

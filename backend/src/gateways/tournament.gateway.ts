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

  handleConnection(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client connected to /tournament: ${client.id}`);
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    this.logger.log(`Client disconnected from /tournament: ${client.id}`);
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('join_tournament')
  handleJoinTournament(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tournamentId: string },
  ) {
    client.join(`tournament:${data.tournamentId}`);
    this.logger.log(
      `Client ${client.id} joined tournament ${data.tournamentId}`,
    );
    return { event: 'joined_tournament', data: { tournamentId: data.tournamentId } };
  }

  @UseGuards(WsJwtGuard)
  @SubscribeMessage('leave_tournament')
  handleLeaveTournament(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { tournamentId: string },
  ) {
    client.leave(`tournament:${data.tournamentId}`);
    this.logger.log(
      `Client ${client.id} left tournament ${data.tournamentId}`,
    );
    return { event: 'left_tournament', data: { tournamentId: data.tournamentId } };
  }

  /**
   * Broadcast standings update to all tournament participants
   * Requirements: 12.1
   * @param tournamentId Tournament ID
   * @param standings Updated standings data
   */
  broadcastStandingsUpdate(tournamentId: string, standings: PlayerStanding[]): void {
    this.logger.log(
      `Broadcasting standings update for tournament ${tournamentId} to ${standings.length} players`,
    );
    
    this.server.to(`tournament:${tournamentId}`).emit('standings_updated', {
      tournamentId,
      standings,
      timestamp: Date.now(),
    });
  }
}

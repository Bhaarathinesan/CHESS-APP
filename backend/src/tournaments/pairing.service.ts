import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TournamentFormat, PairingResult } from '@prisma/client';

/**
 * Pairing Service
 * Implements tournament pairing algorithms for different formats
 * Requirements: 11.1-11.12
 */

interface Player {
  id: string;
  userId: string;
  score: number;
  wins: number;
  losses: number;
  draws: number;
  hasBye: boolean;
}

interface Pairing {
  whitePlayerId: string;
  blackPlayerId: string | null;
  boardNumber: number;
  isBye: boolean;
}

interface PairingHistory {
  whitePlayerId: string;
  blackPlayerId: string;
}

@Injectable()
export class PairingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate pairings for a tournament round based on format
   * Requirements: 11.1-11.6
   */
  async generatePairings(
    tournamentId: string,
    roundNumber: number,
  ): Promise<void> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        players: {
          where: { isActive: true },
          orderBy: [{ score: 'desc' }, { buchholzScore: 'desc' }],
        },
        pairings: true,
      },
    });

    if (!tournament) {
      throw new BadRequestException('Tournament not found');
    }

    const players: Player[] = tournament.players.map((p) => ({
      id: p.id,
      userId: p.userId,
      score: Number(p.score),
      wins: p.wins,
      losses: p.losses,
      draws: p.draws,
      hasBye: p.hasBye,
    }));

    let pairings: Pairing[];

    switch (tournament.format) {
      case TournamentFormat.SWISS:
        pairings = await this.generateSwissPairings(
          tournamentId,
          players,
          roundNumber,
        );
        break;
      case TournamentFormat.ROUND_ROBIN:
        pairings = await this.generateRoundRobinPairings(
          tournamentId,
          players,
          roundNumber,
        );
        break;
      case TournamentFormat.SINGLE_ELIMINATION:
        pairings = await this.generateSingleEliminationPairings(
          tournamentId,
          players,
          roundNumber,
        );
        break;
      case TournamentFormat.DOUBLE_ELIMINATION:
        pairings = await this.generateDoubleEliminationPairings(
          tournamentId,
          players,
          roundNumber,
        );
        break;
      case TournamentFormat.ARENA:
        // Arena mode doesn't use round-based pairings
        throw new BadRequestException(
          'Arena mode does not use round-based pairings',
        );
      default:
        throw new BadRequestException(
          `Unsupported tournament format: ${tournament.format}`,
        );
    }

    // Save pairings to database
    await this.savePairings(tournamentId, roundNumber, pairings);
  }

  /**
   * Swiss System Pairing Algorithm
   * Requirements: 11.1, 11.2, 11.7, 11.8
   * 
   * Rules:
   * - Pair players with same or closest score
   * - Avoid repeat pairings
   * - Handle odd number of players with bye
   * - No player gets bye more than once
   */
  private async generateSwissPairings(
    tournamentId: string,
    players: Player[],
    roundNumber: number,
  ): Promise<Pairing[]> {
    const pairings: Pairing[] = [];
    const paired = new Set<string>();
    const history = await this.getPairingHistory(tournamentId);

    // Sort players by score (descending)
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

    // Handle odd number of players - assign bye
    let byePlayer: Player | null = null;
    if (sortedPlayers.length % 2 === 1) {
      // Find lowest-scored player who hasn't had a bye
      for (let i = sortedPlayers.length - 1; i >= 0; i--) {
        if (!sortedPlayers[i].hasBye) {
          byePlayer = sortedPlayers[i];
          sortedPlayers.splice(i, 1);
          break;
        }
      }

      // If all players have had a bye, give it to the lowest-scored player
      if (!byePlayer) {
        byePlayer = sortedPlayers.pop()!;
      }
    }

    // Group players by score
    const scoreGroups = new Map<number, Player[]>();
    for (const player of sortedPlayers) {
      const score = player.score;
      if (!scoreGroups.has(score)) {
        scoreGroups.set(score, []);
      }
      scoreGroups.get(score)!.push(player);
    }

    // Pair within score groups, then across groups if needed
    const unpaired: Player[] = [];
    
    for (const [score, group] of Array.from(scoreGroups.entries()).sort(
      (a, b) => b[0] - a[0],
    )) {
      const groupPlayers = [...unpaired, ...group];
      unpaired.length = 0;

      while (groupPlayers.length >= 2) {
        const player1 = groupPlayers.shift()!;
        
        // Find opponent who hasn't played against player1
        let opponentIndex = -1;
        for (let i = 0; i < groupPlayers.length; i++) {
          const player2 = groupPlayers[i];
          if (!this.havePlayed(player1.userId, player2.userId, history)) {
            opponentIndex = i;
            break;
          }
        }

        if (opponentIndex !== -1) {
          const player2 = groupPlayers.splice(opponentIndex, 1)[0];
          pairings.push({
            whitePlayerId: player1.userId,
            blackPlayerId: player2.userId,
            boardNumber: pairings.length + 1,
            isBye: false,
          });
          paired.add(player1.userId);
          paired.add(player2.userId);
        } else {
          // Can't find valid opponent in this group, move to next group
          unpaired.push(player1);
        }
      }

      // Add remaining player to unpaired
      if (groupPlayers.length === 1) {
        unpaired.push(groupPlayers[0]);
      }
    }

    // Handle any remaining unpaired players by pairing them even if they've played before
    while (unpaired.length >= 2) {
      const player1 = unpaired.shift()!;
      const player2 = unpaired.shift()!;
      pairings.push({
        whitePlayerId: player1.userId,
        blackPlayerId: player2.userId,
        boardNumber: pairings.length + 1,
        isBye: false,
      });
    }

    // Add bye pairing if exists
    if (byePlayer) {
      pairings.push({
        whitePlayerId: byePlayer.userId,
        blackPlayerId: null,
        boardNumber: pairings.length + 1,
        isBye: true,
      });

      // Mark player as having received a bye
      await this.prisma.tournamentPlayer.update({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId: byePlayer.userId,
          },
        },
        data: { hasBye: true },
      });
    }

    return pairings;
  }

  /**
   * Round Robin Pairing Algorithm
   * Requirements: 11.3
   * 
   * Generates schedule where each player faces every other player exactly once
   * Uses the circle method (Berger tables)
   */
  private async generateRoundRobinPairings(
    tournamentId: string,
    players: Player[],
    roundNumber: number,
  ): Promise<Pairing[]> {
    const n = players.length;
    
    // For round robin, we need to generate all pairings upfront
    // Check if this is the first round
    if (roundNumber === 1) {
      // Generate complete schedule and store it
      await this.generateCompleteRoundRobinSchedule(tournamentId, players);
    }

    // Retrieve pairings for this specific round
    const existingPairings = await this.prisma.tournamentPairing.findMany({
      where: {
        tournamentId,
        roundNumber,
      },
    });

    if (existingPairings.length > 0) {
      // Pairings already exist for this round
      return existingPairings.map((p) => ({
        whitePlayerId: p.whitePlayerId!,
        blackPlayerId: p.blackPlayerId,
        boardNumber: p.boardNumber!,
        isBye: p.isBye,
      }));
    }

    // If pairings don't exist, generate them using circle method
    return this.generateRoundRobinRound(players, roundNumber);
  }

  /**
   * Generate complete Round Robin schedule using circle method
   */
  private async generateCompleteRoundRobinSchedule(
    tournamentId: string,
    players: Player[],
  ): Promise<void> {
    let n = players.length;
    const hasGhost = n % 2 === 1;
    
    if (hasGhost) {
      n += 1; // Add ghost player for odd number
    }

    const totalRounds = n - 1;
    const playerIds = players.map((p) => p.userId);
    
    if (hasGhost) {
      playerIds.push('GHOST'); // Ghost player
    }

    // Update tournament with total rounds
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { roundsTotal: totalRounds },
    });

    // Generate all rounds
    for (let round = 1; round <= totalRounds; round++) {
      const roundPairings = this.generateRoundRobinRound(players, round);
      await this.savePairings(tournamentId, round, roundPairings);
    }
  }

  /**
   * Generate pairings for a specific round using circle method
   */
  private generateRoundRobinRound(
    players: Player[],
    roundNumber: number,
  ): Pairing[] {
    let n = players.length;
    const hasGhost = n % 2 === 1;
    
    if (hasGhost) {
      n += 1;
    }

    const playerIds = players.map((p) => p.userId);
    if (hasGhost) {
      playerIds.push('GHOST');
    }

    // Circle method: fix position 0, rotate others
    const positions = [...playerIds];
    
    // Rotate for the current round
    for (let i = 1; i < roundNumber; i++) {
      const last = positions.pop()!;
      positions.splice(1, 0, last);
    }

    const pairings: Pairing[] = [];
    const half = n / 2;

    for (let i = 0; i < half; i++) {
      const player1 = positions[i];
      const player2 = positions[n - 1 - i];

      // Skip if either player is ghost
      if (player1 === 'GHOST' || player2 === 'GHOST') {
        continue;
      }

      // Alternate colors: even rounds player1 is white, odd rounds player2 is white
      const isPlayer1White = roundNumber % 2 === 1;
      
      pairings.push({
        whitePlayerId: isPlayer1White ? player1 : player2,
        blackPlayerId: isPlayer1White ? player2 : player1,
        boardNumber: pairings.length + 1,
        isBye: false,
      });
    }

    return pairings;
  }

  /**
   * Single Elimination Pairing Algorithm
   * Requirements: 11.4
   * 
   * Pair winners from previous round
   * Create bracket structure
   */
  private async generateSingleEliminationPairings(
    tournamentId: string,
    players: Player[],
    roundNumber: number,
  ): Promise<Pairing[]> {
    if (roundNumber === 1) {
      // First round: seed players and create initial bracket
      return this.generateEliminationFirstRound(players);
    }

    // Subsequent rounds: pair winners from previous round
    const previousRound = await this.prisma.tournamentPairing.findMany({
      where: {
        tournamentId,
        roundNumber: roundNumber - 1,
      },
      include: {
        game: true,
      },
      orderBy: { boardNumber: 'asc' },
    });

    const winners: string[] = [];
    
    for (const pairing of previousRound) {
      if (!pairing.game || !pairing.result) {
        throw new BadRequestException(
          'Previous round games must be completed before generating next round',
        );
      }

      // Determine winner
      if (pairing.result === PairingResult.WHITE_WIN) {
        winners.push(pairing.whitePlayerId!);
      } else if (pairing.result === PairingResult.BLACK_WIN) {
        winners.push(pairing.blackPlayerId!);
      } else if (pairing.result === PairingResult.BYE) {
        winners.push(pairing.whitePlayerId!);
      }
      // Draws in elimination should be handled by tiebreaks, but for now we skip
    }

    // Pair winners sequentially
    const pairings: Pairing[] = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        pairings.push({
          whitePlayerId: winners[i],
          blackPlayerId: winners[i + 1],
          boardNumber: pairings.length + 1,
          isBye: false,
        });
      } else {
        // Odd number of winners, give bye
        pairings.push({
          whitePlayerId: winners[i],
          blackPlayerId: null,
          boardNumber: pairings.length + 1,
          isBye: true,
        });
      }
    }

    return pairings;
  }

  /**
   * Generate first round for elimination tournaments
   */
  private generateEliminationFirstRound(players: Player[]): Pairing[] {
    const pairings: Pairing[] = [];
    const n = players.length;

    // Seed players by rating or random
    const seededPlayers = [...players];

    // Pair 1 vs n, 2 vs n-1, etc.
    for (let i = 0; i < Math.floor(n / 2); i++) {
      pairings.push({
        whitePlayerId: seededPlayers[i].userId,
        blackPlayerId: seededPlayers[n - 1 - i].userId,
        boardNumber: i + 1,
        isBye: false,
      });
    }

    // Handle odd number
    if (n % 2 === 1) {
      pairings.push({
        whitePlayerId: seededPlayers[Math.floor(n / 2)].userId,
        blackPlayerId: null,
        boardNumber: pairings.length + 1,
        isBye: true,
      });
    }

    return pairings;
  }

  /**
   * Double Elimination Pairing Algorithm
   * Requirements: 11.5
   * 
   * Maintain winners and losers brackets
   * Handle grand finals
   */
  private async generateDoubleEliminationPairings(
    tournamentId: string,
    players: Player[],
    roundNumber: number,
  ): Promise<Pairing[]> {
    if (roundNumber === 1) {
      // First round: same as single elimination
      return this.generateEliminationFirstRound(players);
    }

    // Get previous round results
    const previousRound = await this.prisma.tournamentPairing.findMany({
      where: {
        tournamentId,
        roundNumber: roundNumber - 1,
      },
      include: {
        game: true,
      },
      orderBy: { boardNumber: 'asc' },
    });

    const winners: string[] = [];
    const losers: string[] = [];

    for (const pairing of previousRound) {
      if (!pairing.game || !pairing.result) {
        throw new BadRequestException(
          'Previous round games must be completed before generating next round',
        );
      }

      if (pairing.result === PairingResult.WHITE_WIN) {
        winners.push(pairing.whitePlayerId!);
        if (pairing.blackPlayerId) {
          losers.push(pairing.blackPlayerId);
        }
      } else if (pairing.result === PairingResult.BLACK_WIN) {
        winners.push(pairing.blackPlayerId!);
        if (pairing.whitePlayerId) {
          losers.push(pairing.whitePlayerId);
        }
      } else if (pairing.result === PairingResult.BYE) {
        winners.push(pairing.whitePlayerId!);
      }
    }

    // Check if this is grand finals (only 2 players left in winners bracket)
    const activePlayers = await this.prisma.tournamentPlayer.findMany({
      where: {
        tournamentId,
        isActive: true,
      },
    });

    if (activePlayers.length === 2 && winners.length === 1) {
      // Grand finals: winner from winners bracket vs winner from losers bracket
      const winnersChampion = winners[0];
      const losersChampion = losers.length > 0 ? losers[0] : null;

      if (losersChampion) {
        return [
          {
            whitePlayerId: winnersChampion,
            blackPlayerId: losersChampion,
            boardNumber: 1,
            isBye: false,
          },
        ];
      }
    }

    // Regular double elimination round
    // Pair winners bracket
    const winnersPairings: Pairing[] = [];
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        winnersPairings.push({
          whitePlayerId: winners[i],
          blackPlayerId: winners[i + 1],
          boardNumber: winnersPairings.length + 1,
          isBye: false,
        });
      }
    }

    // Pair losers bracket
    const losersPairings: Pairing[] = [];
    for (let i = 0; i < losers.length; i += 2) {
      if (i + 1 < losers.length) {
        losersPairings.push({
          whitePlayerId: losers[i],
          blackPlayerId: losers[i + 1],
          boardNumber: winnersPairings.length + losersPairings.length + 1,
          isBye: false,
        });
      }
    }

    // Mark losers bracket players
    for (const loser of losers) {
      await this.prisma.tournamentPlayer.updateMany({
        where: {
          tournamentId,
          userId: loser,
        },
        data: {
          losses: { increment: 1 },
        },
      });
    }

    return [...winnersPairings, ...losersPairings];
  }

  /**
   * Get pairing history for a tournament
   */
  private async getPairingHistory(
    tournamentId: string,
  ): Promise<PairingHistory[]> {
    const pairings = await this.prisma.tournamentPairing.findMany({
      where: {
        tournamentId,
        isBye: false,
      },
      select: {
        whitePlayerId: true,
        blackPlayerId: true,
      },
    });

    return pairings
      .filter((p) => p.whitePlayerId && p.blackPlayerId)
      .map((p) => ({
        whitePlayerId: p.whitePlayerId!,
        blackPlayerId: p.blackPlayerId!,
      }));
  }

  /**
   * Check if two players have played against each other
   */
  private havePlayed(
    player1Id: string,
    player2Id: string,
    history: PairingHistory[],
  ): boolean {
    return history.some(
      (h) =>
        (h.whitePlayerId === player1Id && h.blackPlayerId === player2Id) ||
        (h.whitePlayerId === player2Id && h.blackPlayerId === player1Id),
    );
  }

  /**
   * Save pairings to database
   */
  private async savePairings(
    tournamentId: string,
    roundNumber: number,
    pairings: Pairing[],
  ): Promise<void> {
    // Delete existing pairings for this round (in case of regeneration)
    await this.prisma.tournamentPairing.deleteMany({
      where: {
        tournamentId,
        roundNumber,
      },
    });

    // Create new pairings
    await this.prisma.tournamentPairing.createMany({
      data: pairings.map((p) => ({
        tournamentId,
        roundNumber,
        whitePlayerId: p.whitePlayerId,
        blackPlayerId: p.blackPlayerId,
        boardNumber: p.boardNumber,
        isBye: p.isBye,
      })),
    });
  }

  /**
   * Arena Mode: Find available opponent for a player
   * Requirements: 11.6
   * 
   * Match players who are available (not in a game)
   * Prefer opponents with similar rating
   */
  async findArenaOpponent(
    tournamentId: string,
    playerId: string,
  ): Promise<string | null> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        players: {
          where: { isActive: true },
        },
      },
    });

    if (!tournament || tournament.format !== TournamentFormat.ARENA) {
      throw new BadRequestException('Invalid arena tournament');
    }

    // Get player's current rating
    const player = await this.prisma.user.findUnique({
      where: { id: playerId },
      include: {
        ratings: {
          where: { timeControl: tournament.timeControl },
        },
      },
    });

    if (!player) {
      throw new BadRequestException('Player not found');
    }

    const playerRating = player.ratings[0]?.rating || 1200;

    // Find available opponents (not currently in a game)
    const availablePlayers = await this.prisma.tournamentPlayer.findMany({
      where: {
        tournamentId,
        isActive: true,
        userId: { not: playerId },
      },
      include: {
        user: {
          include: {
            ratings: {
              where: { timeControl: tournament.timeControl },
            },
            gamesAsWhite: {
              where: {
                tournamentId,
                status: 'ACTIVE',
              },
              take: 1,
            },
            gamesAsBlack: {
              where: {
                tournamentId,
                status: 'ACTIVE',
              },
              take: 1,
            },
          },
        },
      },
    });

    // Filter out players currently in games
    const available = availablePlayers.filter(
      (p) =>
        p.user.gamesAsWhite.length === 0 && p.user.gamesAsBlack.length === 0,
    );

    if (available.length === 0) {
      return null;
    }

    // Sort by rating difference (prefer similar rating)
    available.sort((a, b) => {
      const ratingA = a.user.ratings[0]?.rating || 1200;
      const ratingB = b.user.ratings[0]?.rating || 1200;
      const diffA = Math.abs(ratingA - playerRating);
      const diffB = Math.abs(ratingB - playerRating);
      return diffA - diffB;
    });

    return available[0].userId;
  }

  /**
   * Manual pairing override
   * Requirements: 11.9
   * 
   * Allow admin to create custom pairings
   */
  async createManualPairing(
    tournamentId: string,
    roundNumber: number,
    whitePlayerId: string,
    blackPlayerId: string | null,
    adminId: string,
  ): Promise<void> {
    // Verify admin permissions
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new BadRequestException('Tournament not found');
    }

    const admin = await this.prisma.user.findUnique({
      where: { id: adminId },
    });

    if (
      tournament.creatorId !== adminId &&
      admin?.role !== 'SUPER_ADMIN' &&
      admin?.role !== 'TOURNAMENT_ADMIN'
    ) {
      throw new BadRequestException('Insufficient permissions');
    }

    // Verify players are in tournament
    const players = await this.prisma.tournamentPlayer.findMany({
      where: {
        tournamentId,
        userId: { in: [whitePlayerId, blackPlayerId].filter(Boolean) as string[] },
      },
    });

    if (players.length !== (blackPlayerId ? 2 : 1)) {
      throw new BadRequestException('One or more players not in tournament');
    }

    // Get next board number
    const existingPairings = await this.prisma.tournamentPairing.findMany({
      where: { tournamentId, roundNumber },
    });

    const boardNumber = existingPairings.length + 1;

    // Create pairing
    await this.prisma.tournamentPairing.create({
      data: {
        tournamentId,
        roundNumber,
        whitePlayerId,
        blackPlayerId,
        boardNumber,
        isBye: !blackPlayerId,
      },
    });
  }
}

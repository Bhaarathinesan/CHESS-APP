import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TournamentAwardDto, AwardConfigDto } from './dto/tournament-award.dto';

@Injectable()
export class TournamentAwardsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Award prizes to top finishers based on tournament configuration
   * Requirements: 12.12
   */
  async awardPrizes(
    tournamentId: string,
    awardConfigs: AwardConfigDto[],
  ): Promise<TournamentAwardDto[]> {
    // Verify tournament exists and is completed
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: [
            { rank: 'asc' },
            { score: 'desc' },
          ],
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    if (tournament.status !== 'COMPLETED') {
      throw new BadRequestException('Tournament must be completed before awarding prizes');
    }

    // Get top finishers based on rank
    const topFinishers = tournament.players.filter(
      (player) => player.rank !== null && player.rank > 0,
    );

    if (topFinishers.length === 0) {
      throw new BadRequestException('No ranked players found in tournament');
    }

    // Create awards for configured placements
    const awards: TournamentAwardDto[] = [];

    for (const config of awardConfigs) {
      const player = topFinishers.find((p) => p.rank === config.placement);

      if (!player) {
        // Skip if no player at this placement
        continue;
      }

      // Check if award already exists
      const existingAward = await this.prisma.tournamentAward.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId: player.userId,
          },
        },
      });

      if (existingAward) {
        // Update existing award
        const updatedAward = await this.prisma.tournamentAward.update({
          where: { id: existingAward.id },
          data: {
            placement: config.placement,
            awardTitle: config.title,
            awardDescription: config.description,
          },
          include: {
            user: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        });

        awards.push(this.mapAwardToDto(updatedAward));
      } else {
        // Create new award
        const award = await this.prisma.tournamentAward.create({
          data: {
            tournamentId,
            userId: player.userId,
            placement: config.placement,
            awardTitle: config.title,
            awardDescription: config.description,
          },
          include: {
            user: {
              select: {
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        });

        awards.push(this.mapAwardToDto(award));
      }
    }

    return awards;
  }

  /**
   * Get all awards for a tournament
   * Requirements: 12.12
   */
  async getTournamentAwards(tournamentId: string): Promise<TournamentAwardDto[]> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(`Tournament with ID ${tournamentId} not found`);
    }

    const awards = await this.prisma.tournamentAward.findMany({
      where: { tournamentId },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        placement: 'asc',
      },
    });

    return awards.map((award) => this.mapAwardToDto(award));
  }

  /**
   * Get awards for a specific user
   * Requirements: 12.12
   */
  async getUserAwards(userId: string): Promise<TournamentAwardDto[]> {
    const awards = await this.prisma.tournamentAward.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        tournament: {
          select: {
            name: true,
            format: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return awards.map((award) => this.mapAwardToDto(award));
  }

  /**
   * Delete awards for a tournament
   * Requirements: 12.12
   */
  async deleteAwards(tournamentId: string): Promise<void> {
    await this.prisma.tournamentAward.deleteMany({
      where: { tournamentId },
    });
  }

  /**
   * Parse prize description and generate default award configs
   * Requirements: 12.12
   */
  parsePrizeDescription(prizeDescription: string): AwardConfigDto[] {
    if (!prizeDescription || prizeDescription.trim() === '') {
      // Default awards for top 3
      return [
        { placement: 1, title: '1st Place', description: 'Tournament Champion' },
        { placement: 2, title: '2nd Place', description: 'Runner-up' },
        { placement: 3, title: '3rd Place', description: 'Third Place' },
      ];
    }

    // Try to parse structured prize description
    // Format: "1st: Title - Description; 2nd: Title - Description; ..."
    const awards: AwardConfigDto[] = [];
    const lines = prizeDescription.split(/[;\n]/);

    for (const line of lines) {
      const match = line.match(/^(\d+)(?:st|nd|rd|th)?:\s*([^-]+)(?:\s*-\s*(.+))?$/i);
      if (match) {
        const placement = parseInt(match[1], 10);
        const title = match[2].trim();
        const description = match[3]?.trim();

        awards.push({
          placement,
          title,
          description,
        });
      }
    }

    // If parsing failed, return default awards
    if (awards.length === 0) {
      return [
        { placement: 1, title: '1st Place', description: prizeDescription },
        { placement: 2, title: '2nd Place', description: undefined },
        { placement: 3, title: '3rd Place', description: undefined },
      ];
    }

    return awards;
  }

  /**
   * Map database award to DTO
   */
  private mapAwardToDto(award: any): TournamentAwardDto {
    return {
      id: award.id,
      tournamentId: award.tournamentId,
      userId: award.userId,
      placement: award.placement,
      awardTitle: award.awardTitle,
      awardDescription: award.awardDescription,
      createdAt: award.createdAt,
      username: award.user?.username,
      displayName: award.user?.displayName,
      avatarUrl: award.user?.avatarUrl,
    };
  }
}

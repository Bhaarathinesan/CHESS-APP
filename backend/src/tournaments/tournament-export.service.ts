import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StandingsService } from './standings.service';
import { createObjectCsvWriter } from 'csv-writer';
import * as PDFDocument from 'pdfkit';
import { Readable } from 'stream';

/**
 * Service for exporting tournament results in various formats
 * Requirements: 12.9, 12.10
 */
@Injectable()
export class TournamentExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly standingsService: StandingsService,
  ) {}

  /**
   * Generate tournament results report data
   * Requirements: 12.9
   * @param tournamentId Tournament ID
   * @returns Complete tournament results data
   */
  async generateResultsReport(tournamentId: string) {
    // Get tournament details
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Tournament with ID ${tournamentId} not found`,
      );
    }

    // Get final standings
    const standings = await this.standingsService.getStandings(tournamentId);

    // Get all pairings with game results
    const pairings = await this.prisma.tournamentPairing.findMany({
      where: { tournamentId },
      include: {
        whitePlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        blackPlayer: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        game: {
          select: {
            id: true,
            status: true,
            result: true,
            terminationReason: true,
            pgn: true,
          },
        },
      },
      orderBy: [{ roundNumber: 'asc' }, { boardNumber: 'asc' }],
    });

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        format: tournament.format,
        timeControl: tournament.timeControl,
        initialTimeMinutes: tournament.initialTimeMinutes,
        incrementSeconds: tournament.incrementSeconds,
        isRated: tournament.isRated,
        status: tournament.status,
        creator: tournament.creator,
        startTime: tournament.startTime,
        endTime: tournament.endTime,
        roundsTotal: tournament.roundsTotal,
        roundsCompleted: tournament.roundsCompleted,
        currentPlayers: tournament.currentPlayers,
        tiebreakCriteria: tournament.tiebreakCriteria,
      },
      standings,
      pairings: pairings.map((p) => ({
        roundNumber: p.roundNumber,
        boardNumber: p.boardNumber,
        whitePlayer: p.whitePlayer?.displayName || 'BYE',
        blackPlayer: p.blackPlayer?.displayName || 'BYE',
        result: p.result,
        isBye: p.isBye,
      })),
    };
  }

  /**
   * Export tournament results as CSV
   * Requirements: 12.9
   * @param tournamentId Tournament ID
   * @returns CSV file as buffer
   */
  async exportAsCSV(tournamentId: string): Promise<Buffer> {
    const report = await this.generateResultsReport(tournamentId);

    // Create CSV content manually for better control
    const lines: string[] = [];

    // Tournament metadata
    lines.push('Tournament Results Report');
    lines.push('');
    lines.push(`Tournament Name,${this.escapeCsvValue(report.tournament.name)}`);
    lines.push(`Format,${report.tournament.format}`);
    lines.push(`Time Control,${report.tournament.timeControl} (${report.tournament.initialTimeMinutes}+${report.tournament.incrementSeconds})`);
    lines.push(`Rated,${report.tournament.isRated ? 'Yes' : 'No'}`);
    lines.push(`Status,${report.tournament.status}`);
    lines.push(`Organizer,${this.escapeCsvValue(report.tournament.creator.displayName)}`);
    lines.push(`Start Time,${report.tournament.startTime.toISOString()}`);
    if (report.tournament.endTime) {
      lines.push(`End Time,${report.tournament.endTime.toISOString()}`);
    }
    lines.push(`Total Rounds,${report.tournament.roundsTotal || 'N/A'}`);
    lines.push(`Rounds Completed,${report.tournament.roundsCompleted}`);
    lines.push(`Total Players,${report.tournament.currentPlayers}`);
    lines.push(`Tiebreak Method,${report.tournament.tiebreakCriteria}`);
    lines.push('');

    // Final standings
    lines.push('Final Standings');
    lines.push('Rank,Player,Score,Wins,Losses,Draws,Games Played,Buchholz,Sonneborn-Berger');
    
    for (const standing of report.standings) {
      lines.push(
        `${standing.rank},${this.escapeCsvValue(standing.displayName)},${standing.score},${standing.wins},${standing.losses},${standing.draws},${standing.gamesPlayed},${standing.buchholzScore.toFixed(2)},${standing.sonneborBerger.toFixed(2)}`
      );
    }
    lines.push('');

    // All pairings and results
    lines.push('All Pairings and Results');
    lines.push('Round,Board,White Player,Black Player,Result');
    
    for (const pairing of report.pairings) {
      const result = pairing.isBye ? 'BYE' : (pairing.result || 'In Progress');
      lines.push(
        `${pairing.roundNumber},${pairing.boardNumber},${this.escapeCsvValue(pairing.whitePlayer)},${this.escapeCsvValue(pairing.blackPlayer)},${result}`
      );
    }

    // Convert to buffer
    const csvContent = lines.join('\n');
    return Buffer.from(csvContent, 'utf-8');
  }

  /**
   * Export tournament results as PDF
   * Requirements: 12.10
   * @param tournamentId Tournament ID
   * @returns PDF file as buffer
   */
  async exportAsPDF(tournamentId: string): Promise<Buffer> {
    const report = await this.generateResultsReport(tournamentId);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const chunks: Buffer[] = [];

        // Collect PDF chunks
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(20).font('Helvetica-Bold').text('Tournament Results Report', {
          align: 'center',
        });
        doc.moveDown();

        // Tournament metadata
        doc.fontSize(16).font('Helvetica-Bold').text('Tournament Information');
        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica');
        
        doc.text(`Name: ${report.tournament.name}`);
        doc.text(`Format: ${report.tournament.format}`);
        doc.text(`Time Control: ${report.tournament.timeControl} (${report.tournament.initialTimeMinutes}+${report.tournament.incrementSeconds})`);
        doc.text(`Rated: ${report.tournament.isRated ? 'Yes' : 'No'}`);
        doc.text(`Status: ${report.tournament.status}`);
        doc.text(`Organizer: ${report.tournament.creator.displayName}`);
        doc.text(`Start Time: ${report.tournament.startTime.toLocaleString()}`);
        if (report.tournament.endTime) {
          doc.text(`End Time: ${report.tournament.endTime.toLocaleString()}`);
        }
        doc.text(`Total Rounds: ${report.tournament.roundsTotal || 'N/A'}`);
        doc.text(`Rounds Completed: ${report.tournament.roundsCompleted}`);
        doc.text(`Total Players: ${report.tournament.currentPlayers}`);
        doc.text(`Tiebreak Method: ${report.tournament.tiebreakCriteria}`);
        doc.moveDown(2);

        // Final standings
        doc.fontSize(16).font('Helvetica-Bold').text('Final Standings');
        doc.moveDown(0.5);

        // Standings table header
        doc.fontSize(10).font('Helvetica-Bold');
        const tableTop = doc.y;
        const colWidths = {
          rank: 40,
          player: 150,
          score: 50,
          wins: 40,
          losses: 40,
          draws: 40,
          games: 50,
        };

        let x = 50;
        doc.text('Rank', x, tableTop, { width: colWidths.rank });
        x += colWidths.rank;
        doc.text('Player', x, tableTop, { width: colWidths.player });
        x += colWidths.player;
        doc.text('Score', x, tableTop, { width: colWidths.score });
        x += colWidths.score;
        doc.text('W', x, tableTop, { width: colWidths.wins });
        x += colWidths.wins;
        doc.text('L', x, tableTop, { width: colWidths.losses });
        x += colWidths.losses;
        doc.text('D', x, tableTop, { width: colWidths.draws });
        x += colWidths.draws;
        doc.text('Games', x, tableTop, { width: colWidths.games });

        doc.moveDown(0.5);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.3);

        // Standings table rows
        doc.font('Helvetica');
        for (const standing of report.standings) {
          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
          }

          const rowY = doc.y;
          x = 50;
          
          doc.text(standing.rank.toString(), x, rowY, { width: colWidths.rank });
          x += colWidths.rank;
          
          // Truncate long names
          const playerName = standing.displayName.length > 25 
            ? standing.displayName.substring(0, 22) + '...' 
            : standing.displayName;
          doc.text(playerName, x, rowY, { width: colWidths.player });
          x += colWidths.player;
          
          doc.text(standing.score.toString(), x, rowY, { width: colWidths.score });
          x += colWidths.score;
          doc.text(standing.wins.toString(), x, rowY, { width: colWidths.wins });
          x += colWidths.wins;
          doc.text(standing.losses.toString(), x, rowY, { width: colWidths.losses });
          x += colWidths.losses;
          doc.text(standing.draws.toString(), x, rowY, { width: colWidths.draws });
          x += colWidths.draws;
          doc.text(standing.gamesPlayed.toString(), x, rowY, { width: colWidths.games });

          doc.moveDown(0.8);
        }

        doc.moveDown(2);

        // Pairings section
        if (doc.y > 650) {
          doc.addPage();
        }

        doc.fontSize(16).font('Helvetica-Bold').text('All Pairings and Results');
        doc.moveDown(0.5);

        // Group pairings by round
        const pairingsByRound = report.pairings.reduce((acc, pairing) => {
          if (!acc[pairing.roundNumber]) {
            acc[pairing.roundNumber] = [];
          }
          acc[pairing.roundNumber].push(pairing);
          return acc;
        }, {} as Record<number, typeof report.pairings>);

        // Display each round
        for (const roundNum of Object.keys(pairingsByRound).sort((a, b) => Number(a) - Number(b))) {
          if (doc.y > 700) {
            doc.addPage();
          }

          doc.fontSize(12).font('Helvetica-Bold').text(`Round ${roundNum}`);
          doc.moveDown(0.3);
          doc.fontSize(10).font('Helvetica');

          for (const pairing of pairingsByRound[roundNum]) {
            if (doc.y > 720) {
              doc.addPage();
            }

            const result = pairing.isBye ? 'BYE' : (pairing.result || 'In Progress');
            const whitePlayer = pairing.whitePlayer.length > 20 
              ? pairing.whitePlayer.substring(0, 17) + '...' 
              : pairing.whitePlayer;
            const blackPlayer = pairing.blackPlayer.length > 20 
              ? pairing.blackPlayer.substring(0, 17) + '...' 
              : pairing.blackPlayer;

            doc.text(
              `Board ${pairing.boardNumber}: ${whitePlayer} vs ${blackPlayer} - ${result}`
            );
          }
          doc.moveDown(1);
        }

        // Footer
        const pageCount = doc.bufferedPageRange().count;
        const startPage = doc.bufferedPageRange().start;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(startPage + i);
          doc.fontSize(8).font('Helvetica').text(
            `Generated on ${new Date().toLocaleString()} - Page ${i + 1} of ${pageCount}`,
            50,
            doc.page.height - 30,
            { align: 'center' }
          );
        }

        // Finalize PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Escape CSV values to handle commas, quotes, and newlines
   */
  private escapeCsvValue(value: string): string {
    if (!value) return '';
    
    // If value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    
    return value;
  }
}

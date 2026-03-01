import { Injectable } from '@nestjs/common';
import { ParsedGame } from './pgn-parser.service';

/**
 * Service for formatting game objects into PGN (Portable Game Notation) format
 * Supports:
 * - All required PGN headers (Event, Site, Date, Round, White, Black, Result)
 * - Move formatting with proper move numbers
 * - Standard Algebraic Notation (SAN)
 * - Comments and variations
 */
@Injectable()
export class PgnFormatterService {
  /**
   * Format a single game object into PGN string
   * @param game Parsed game object to format
   * @returns PGN formatted string
   */
  formatGame(game: ParsedGame): string {
    const lines: string[] = [];

    // Format headers
    lines.push(...this.formatHeaders(game.headers));

    // Add blank line between headers and moves
    lines.push('');

    // Format moves
    lines.push(this.formatMoves(game));

    return lines.join('\n');
  }

  /**
   * Format multiple games into a single PGN string
   * @param games Array of parsed game objects
   * @returns PGN formatted string with all games
   */
  formatMultipleGames(games: ParsedGame[]): string {
    return games.map((game) => this.formatGame(game)).join('\n\n');
  }

  /**
   * Format PGN headers in the correct order
   * Required headers: Event, Site, Date, Round, White, Black, Result
   */
  private formatHeaders(headers: Record<string, string>): string[] {
    const lines: string[] = [];

    // Required headers in standard order
    const requiredHeaders = [
      'Event',
      'Site',
      'Date',
      'Round',
      'White',
      'Black',
      'Result',
    ];

    // Add required headers first
    for (const header of requiredHeaders) {
      if (headers[header] !== undefined) {
        lines.push(`[${header} "${headers[header]}"]`);
      }
    }

    // Add any additional headers (optional headers like ECO, WhiteElo, BlackElo, etc.)
    for (const [key, value] of Object.entries(headers)) {
      if (!requiredHeaders.includes(key)) {
        lines.push(`[${key} "${value}"]`);
      }
    }

    return lines;
  }

  /**
   * Format moves with proper move numbers and notation
   * Includes comments and variations if present
   */
  private formatMoves(game: ParsedGame): string {
    const parts: string[] = [];
    let moveNumber = 1;
    let isWhiteMove = true;

    for (let i = 0; i < game.moves.length; i++) {
      const move = game.moves[i];

      // Add move number for white's moves
      if (isWhiteMove) {
        parts.push(`${moveNumber}.`);
      }

      // Add the move
      parts.push(move);

      // Add comments if present
      if (game.comments && game.comments[i + 1]) {
        for (const comment of game.comments[i + 1]) {
          parts.push(`{${comment}}`);
        }
      }

      // Add variations if present
      if (game.variations && game.variations[i + 1]) {
        for (const variation of game.variations[i + 1]) {
          parts.push(`(${this.formatVariation(variation, moveNumber, !isWhiteMove)})`);
        }
      }

      // Toggle between white and black moves
      if (!isWhiteMove) {
        moveNumber++;
      }
      isWhiteMove = !isWhiteMove;
    }

    // Add result marker
    if (game.result) {
      parts.push(game.result);
    } else if (game.headers && game.headers['Result']) {
      parts.push(game.headers['Result']);
    }

    // Join parts with spaces and wrap at reasonable line length
    return this.wrapMoveText(parts.join(' '));
  }

  /**
   * Format a variation (moves in parentheses)
   */
  private formatVariation(
    variation: string[],
    startMoveNumber: number,
    startWithBlack: boolean,
  ): string {
    const parts: string[] = [];
    let moveNumber = startMoveNumber;
    let isWhiteMove = !startWithBlack;

    for (const move of variation) {
      // Add move number
      if (isWhiteMove) {
        parts.push(`${moveNumber}.`);
      } else if (parts.length === 0) {
        // For variations starting with black's move, use ellipsis notation
        parts.push(`${moveNumber}...`);
      }

      parts.push(move);

      // Toggle between white and black moves
      if (!isWhiteMove) {
        moveNumber++;
      }
      isWhiteMove = !isWhiteMove;
    }

    return parts.join(' ');
  }

  /**
   * Wrap move text at reasonable line length (80 characters)
   * Ensures moves and comments are not split in the middle
   */
  private wrapMoveText(moveText: string): string {
    const maxLineLength = 80;
    const tokens = this.tokenizeMoveText(moveText);
    const lines: string[] = [];
    let currentLine = '';

    for (const token of tokens) {
      // Check if adding this token would exceed line length
      if (currentLine.length + token.length + 1 > maxLineLength) {
        if (currentLine.length > 0) {
          lines.push(currentLine.trim());
          currentLine = '';
        }
      }

      currentLine += (currentLine.length > 0 ? ' ' : '') + token;
    }

    // Add the last line
    if (currentLine.length > 0) {
      lines.push(currentLine.trim());
    }

    return lines.join('\n');
  }

  /**
   * Tokenize move text, keeping comments and variations as single tokens
   */
  private tokenizeMoveText(moveText: string): string[] {
    const tokens: string[] = [];
    let position = 0;

    while (position < moveText.length) {
      // Skip whitespace
      if (moveText[position] === ' ') {
        position++;
        continue;
      }

      // Handle comments - keep entire comment as one token
      if (moveText[position] === '{') {
        const endBrace = moveText.indexOf('}', position);
        if (endBrace !== -1) {
          tokens.push(moveText.substring(position, endBrace + 1));
          position = endBrace + 1;
          continue;
        }
      }

      // Handle variations - keep entire variation as one token
      if (moveText[position] === '(') {
        let depth = 0;
        let endPos = position;
        while (endPos < moveText.length) {
          if (moveText[endPos] === '(') depth++;
          if (moveText[endPos] === ')') {
            depth--;
            if (depth === 0) {
              tokens.push(moveText.substring(position, endPos + 1));
              position = endPos + 1;
              break;
            }
          }
          endPos++;
        }
        continue;
      }

      // Handle regular tokens (moves, move numbers, result markers)
      const nextSpace = moveText.indexOf(' ', position);
      if (nextSpace === -1) {
        tokens.push(moveText.substring(position));
        break;
      } else {
        tokens.push(moveText.substring(position, nextSpace));
        position = nextSpace;
      }
    }

    return tokens;
  }
}

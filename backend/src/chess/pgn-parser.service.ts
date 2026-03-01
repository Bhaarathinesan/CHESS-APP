import { Injectable } from '@nestjs/common';
import { Chess } from 'chess.js';

/**
 * Represents a parsed PGN game with headers and moves
 */
export interface ParsedGame {
  headers: Record<string, string>;
  moves: string[];
  comments: Record<number, string[]>; // Move index to comments
  variations: Record<number, string[][]>; // Move index to variations
  result?: string;
}

/**
 * Error thrown when PGN parsing fails
 */
export class PgnParseError extends Error {
  constructor(
    message: string,
    public readonly line?: number,
    public readonly column?: number,
  ) {
    super(message);
    this.name = 'PgnParseError';
  }
}

/**
 * Service for parsing and validating PGN (Portable Game Notation) files
 * Supports:
 * - Multiple games in one file
 * - Standard PGN headers (Event, Site, Date, Round, White, Black, Result)
 * - Move text in Standard Algebraic Notation (SAN)
 * - Comments and variations
 * - Descriptive error messages for invalid PGN
 */
@Injectable()
export class PgnParserService {
  /**
   * Parse a PGN string containing one or more games
   * @param pgnText PGN text to parse
   * @returns Array of parsed games
   * @throws PgnParseError if PGN is invalid
   */
  parseMultipleGames(pgnText: string): ParsedGame[] {
    if (!pgnText || pgnText.trim().length === 0) {
      throw new PgnParseError('PGN text is empty');
    }

    const games: ParsedGame[] = [];
    const gameTexts = this.splitIntoGames(pgnText);

    for (let i = 0; i < gameTexts.length; i++) {
      try {
        const game = this.parseSingleGame(gameTexts[i]);
        games.push(game);
      } catch (error) {
        if (error instanceof PgnParseError) {
          throw new PgnParseError(
            `Error parsing game ${i + 1}: ${error.message}`,
            error.line,
            error.column,
          );
        }
        throw error;
      }
    }

    return games;
  }

  /**
   * Parse a single PGN game
   * @param pgnText PGN text for a single game
   * @returns Parsed game object
   * @throws PgnParseError if PGN is invalid
   */
  parseSingleGame(pgnText: string): ParsedGame {
    if (!pgnText || pgnText.trim().length === 0) {
      throw new PgnParseError('PGN text is empty');
    }

    const lines = pgnText.split('\n');
    const headers: Record<string, string> = {};
    let moveText = '';
    let lineNumber = 0;

    // Parse headers
    for (let i = 0; i < lines.length; i++) {
      lineNumber = i + 1;
      const line = lines[i].trim();

      if (line.length === 0) {
        continue;
      }

      // Check if this is a header line
      if (line.startsWith('[') && line.endsWith(']')) {
        const headerMatch = line.match(/^\[(\w+)\s+"([^"]*)"\]$/);
        if (!headerMatch) {
          throw new PgnParseError(
            `Invalid header format: ${line}`,
            lineNumber,
            0,
          );
        }
        headers[headerMatch[1]] = headerMatch[2];
      } else {
        // This is move text, collect all remaining lines
        moveText = lines.slice(i).join(' ');
        break;
      }
    }

    // Validate required headers
    this.validateHeaders(headers, lineNumber);

    // Parse move text
    const { moves, comments, variations, result } = this.parseMoveText(
      moveText,
      lineNumber,
    );

    return {
      headers,
      moves,
      comments,
      variations,
      result,
    };
  }

  /**
   * Validate that a parsed game can be played through using chess.js
   * @param game Parsed game to validate
   * @returns true if game is valid
   * @throws PgnParseError if game contains invalid moves
   */
  validateGame(game: ParsedGame): boolean {
    const chess = new Chess();

    for (let i = 0; i < game.moves.length; i++) {
      try {
        const move = chess.move(game.moves[i]);
        if (!move) {
          throw new PgnParseError(
            `Invalid move at position ${i + 1}: ${game.moves[i]}`,
          );
        }
      } catch (error) {
        throw new PgnParseError(
          `Invalid move at position ${i + 1}: ${game.moves[i]} - ${error.message}`,
        );
      }
    }

    return true;
  }

  /**
   * Split PGN text into individual games
   * Games are separated by blank lines followed by headers
   */
  private splitIntoGames(pgnText: string): string[] {
    const games: string[] = [];
    const lines = pgnText.split('\n');
    let currentGame: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check if this is the start of a new game (Event header typically comes first)
      if (trimmed.startsWith('[Event ')) {
        // If we have a current game, save it
        if (currentGame.length > 0) {
          games.push(currentGame.join('\n'));
          currentGame = [];
        }
      }

      // Add line to current game if it's not empty or if we're in a game
      if (currentGame.length > 0 || trimmed.startsWith('[')) {
        currentGame.push(line);
      }
    }

    // Add the last game
    if (currentGame.length > 0) {
      games.push(currentGame.join('\n'));
    }

    return games;
  }

  /**
   * Validate that required PGN headers are present
   */
  private validateHeaders(
    headers: Record<string, string>,
    lineNumber: number,
  ): void {
    const requiredHeaders = ['Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result'];

    for (const header of requiredHeaders) {
      if (!(header in headers)) {
        throw new PgnParseError(
          `Missing required header: ${header}`,
          lineNumber,
          0,
        );
      }
    }

    // Validate Result header format
    const validResults = ['1-0', '0-1', '1/2-1/2', '*'];
    if (!validResults.includes(headers['Result'])) {
      throw new PgnParseError(
        `Invalid Result header: ${headers['Result']}. Must be one of: ${validResults.join(', ')}`,
        lineNumber,
        0,
      );
    }
  }

  /**
   * Parse move text, extracting moves, comments, and variations
   */
  private parseMoveText(
    moveText: string,
    startLine: number,
  ): {
    moves: string[];
    comments: Record<number, string[]>;
    variations: Record<number, string[][]>;
    result?: string;
  } {
    const moves: string[] = [];
    const comments: Record<number, string[]> = {};
    const variations: Record<number, string[][]> = {};
    let result: string | undefined;

    // Remove newlines and extra spaces
    let text = moveText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

    if (text.length === 0) {
      throw new PgnParseError('Move text is empty', startLine, 0);
    }

    let position = 0;
    let moveIndex = 0;

    while (position < text.length) {
      const char = text[position];

      // Skip whitespace
      if (char === ' ') {
        position++;
        continue;
      }

      // Handle comments in braces
      if (char === '{') {
        const endBrace = text.indexOf('}', position);
        if (endBrace === -1) {
          throw new PgnParseError(
            'Unclosed comment brace',
            startLine,
            position,
          );
        }
        const comment = text.substring(position + 1, endBrace).trim();
        if (!comments[moveIndex]) {
          comments[moveIndex] = [];
        }
        comments[moveIndex].push(comment);
        position = endBrace + 1;
        continue;
      }

      // Handle variations in parentheses
      if (char === '(') {
        const { endPos, variation } = this.extractVariation(
          text,
          position,
          startLine,
        );
        if (!variations[moveIndex]) {
          variations[moveIndex] = [];
        }
        variations[moveIndex].push(variation);
        position = endPos;
        continue;
      }

      // Handle move numbers (e.g., "1.", "23...")
      if (/\d/.test(char)) {
        const moveNumMatch = text.substring(position).match(/^\d+\.+/);
        if (moveNumMatch) {
          position += moveNumMatch[0].length;
          continue;
        }
      }

      // Handle result markers
      if (
        text.substring(position).startsWith('1-0') ||
        text.substring(position).startsWith('0-1') ||
        text.substring(position).startsWith('1/2-1/2') ||
        text.substring(position).startsWith('*')
      ) {
        const resultMatch = text
          .substring(position)
          .match(/^(1-0|0-1|1\/2-1\/2|\*)/);
        if (resultMatch) {
          result = resultMatch[1];
          position += resultMatch[1].length;
          continue;
        }
      }

      // Extract move in SAN notation
      const moveMatch = text
        .substring(position)
        .match(/^([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](=[NBRQ])?|O-O-O|O-O)[\+#]?[!?]*/);

      if (moveMatch) {
        const move = moveMatch[0].replace(/[!?#\+]/g, ''); // Remove annotation symbols and check/checkmate
        moves.push(move);
        moveIndex++;
        position += moveMatch[0].length;
      } else {
        // Try to find the next valid token
        const nextSpace = text.indexOf(' ', position);
        const invalidToken =
          nextSpace === -1
            ? text.substring(position)
            : text.substring(position, nextSpace);

        throw new PgnParseError(
          `Invalid move or token: "${invalidToken}"`,
          startLine,
          position,
        );
      }
    }

    if (moves.length === 0) {
      throw new PgnParseError('No moves found in move text', startLine, 0);
    }

    return { moves, comments, variations, result };
  }

  /**
   * Extract a variation from parentheses
   */
  private extractVariation(
    text: string,
    startPos: number,
    startLine: number,
  ): { endPos: number; variation: string[] } {
    let depth = 0;
    let position = startPos;
    let variationText = '';

    while (position < text.length) {
      const char = text[position];

      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
        if (depth === 0) {
          // Extract moves from variation text
          const variation = this.extractMovesFromText(
            variationText.trim(),
            startLine,
          );
          return { endPos: position + 1, variation };
        }
      }

      if (depth > 0 && char !== '(') {
        variationText += char;
      }

      position++;
    }

    throw new PgnParseError('Unclosed variation parenthesis', startLine, startPos);
  }

  /**
   * Extract just the moves from text (ignoring move numbers and annotations)
   */
  private extractMovesFromText(text: string, startLine: number): string[] {
    const moves: string[] = [];
    let position = 0;

    text = text.replace(/\{[^}]*\}/g, ''); // Remove comments
    text = text.replace(/\s+/g, ' ').trim();

    while (position < text.length) {
      const char = text[position];

      if (char === ' ') {
        position++;
        continue;
      }

      // Skip move numbers
      if (/\d/.test(char)) {
        const moveNumMatch = text.substring(position).match(/^\d+\.+/);
        if (moveNumMatch) {
          position += moveNumMatch[0].length;
          continue;
        }
      }

      // Extract move
      const moveMatch = text
        .substring(position)
        .match(/^([NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](=[NBRQ])?|O-O-O|O-O)[\+#]?[!?]*/);

      if (moveMatch) {
        const move = moveMatch[0].replace(/[!?]/g, '');
        moves.push(move);
        position += moveMatch[0].length;
      } else {
        position++;
      }
    }

    return moves;
  }
}

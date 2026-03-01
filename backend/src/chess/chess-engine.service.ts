import { Injectable } from '@nestjs/common';
import { Chess, Move, Square } from 'chess.js';

/**
 * ChessEngineService wraps the chess.js library to provide
 * move validation, game state management, and notation handling.
 * 
 * This service is focused solely on chess rules and logic,
 * not on game persistence or multiplayer features.
 */
@Injectable()
export class ChessEngineService {
  /**
   * Create a new chess game instance
   * @param fen Optional FEN string to initialize the position
   * @returns Chess instance
   */
  createGame(fen?: string): Chess {
    return new Chess(fen);
  }

  /**
   * Validate if a move is legal in the current position
   * @param game Chess instance
   * @param from Source square (e.g., 'e2')
   * @param to Destination square (e.g., 'e4')
   * @param promotion Optional promotion piece ('q', 'r', 'b', 'n')
   * @returns true if move is valid, false otherwise
   */
  isValidMove(
    game: Chess,
    from: string,
    to: string,
    promotion?: string,
  ): boolean {
    try {
      const moves = game.moves({ square: from as Square, verbose: true });
      return moves.some(
        (move) =>
          move.to === to &&
          (!promotion || move.promotion === promotion),
      );
    } catch {
      return false;
    }
  }

  /**
   * Make a move on the board
   * @param game Chess instance
   * @param from Source square
   * @param to Destination square
   * @param promotion Optional promotion piece
   * @returns Move object if successful, null if invalid
   */
  makeMove(
    game: Chess,
    from: string,
    to: string,
    promotion?: string,
  ): Move | null {
    try {
      return game.move({ from, to, promotion });
    } catch {
      return null;
    }
  }

  /**
   * Make a move using SAN notation
   * @param game Chess instance
   * @param san Standard Algebraic Notation move (e.g., 'Nf3', 'e4')
   * @returns Move object if successful, null if invalid
   */
  makeMoveSan(game: Chess, san: string): Move | null {
    try {
      return game.move(san);
    } catch {
      return null;
    }
  }

  /**
   * Get all legal moves for the current position
   * @param game Chess instance
   * @param square Optional square to get moves for specific piece
   * @returns Array of legal moves in verbose format
   */
  getLegalMoves(game: Chess, square?: string): Move[] {
    if (square) {
      return game.moves({ square: square as Square, verbose: true });
    }
    return game.moves({ verbose: true });
  }

  /**
   * Check if the current position is in check
   * @param game Chess instance
   * @returns true if current player is in check
   */
  isCheck(game: Chess): boolean {
    return game.isCheck();
  }

  /**
   * Check if the current position is checkmate
   * @param game Chess instance
   * @returns true if current player is checkmated
   */
  isCheckmate(game: Chess): boolean {
    return game.isCheckmate();
  }

  /**
   * Check if the current position is stalemate
   * @param game Chess instance
   * @returns true if position is stalemate
   */
  isStalemate(game: Chess): boolean {
    return game.isStalemate();
  }

  /**
   * Check if the game is drawn
   * @param game Chess instance
   * @returns true if game is drawn (stalemate, insufficient material, etc.)
   */
  isDraw(game: Chess): boolean {
    return game.isDraw();
  }

  /**
   * Check if position has insufficient material for checkmate
   * @param game Chess instance
   * @returns true if insufficient material
   */
  isInsufficientMaterial(game: Chess): boolean {
    return game.isInsufficientMaterial();
  }

  /**
   * Check if position is threefold repetition
   * @param game Chess instance
   * @returns true if position has occurred three times
   */
  isThreefoldRepetition(game: Chess): boolean {
    return game.isThreefoldRepetition();
  }

  /**
   * Check if the game is over
   * @param game Chess instance
   * @returns true if game is over (checkmate, stalemate, or draw)
   */
  isGameOver(game: Chess): boolean {
    return game.isGameOver();
  }

  /**
   * Get the current FEN string
   * @param game Chess instance
   * @returns FEN string representing current position
   */
  getFen(game: Chess): string {
    return game.fen();
  }

  /**
   * Load a position from FEN string
   * @param game Chess instance
   * @param fen FEN string
   * @returns true if FEN is valid and loaded successfully
   */
  loadFen(game: Chess, fen: string): boolean {
    try {
      game.load(fen);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the game in PGN format
   * @param game Chess instance
   * @returns PGN string
   */
  getPgn(game: Chess): string {
    return game.pgn();
  }

  /**
   * Load a game from PGN string
   * @param game Chess instance
   * @param pgn PGN string
   * @returns true if PGN is valid and loaded successfully
   */
  loadPgn(game: Chess, pgn: string): boolean {
    try {
      game.loadPgn(pgn);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the move history
   * @param game Chess instance
   * @param verbose If true, returns detailed move objects
   * @returns Array of moves
   */
  getHistory(game: Chess, verbose = false): string[] | Move[] {
    return game.history({ verbose });
  }

  /**
   * Undo the last move
   * @param game Chess instance
   * @returns Move object of undone move, or null if no moves to undo
   */
  undo(game: Chess): Move | null {
    return game.undo();
  }

  /**
   * Reset the game to starting position
   * @param game Chess instance
   */
  reset(game: Chess): void {
    game.reset();
  }

  /**
   * Get the current turn
   * @param game Chess instance
   * @returns 'w' for white, 'b' for black
   */
  getTurn(game: Chess): 'w' | 'b' {
    return game.turn();
  }

  /**
   * Get ASCII representation of the board (useful for debugging)
   * @param game Chess instance
   * @returns ASCII string of the board
   */
  getAscii(game: Chess): string {
    return game.ascii();
  }
}

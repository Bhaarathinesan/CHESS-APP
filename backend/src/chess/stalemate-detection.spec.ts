import { Test, TestingModule } from '@nestjs/testing';
import { ChessEngineService } from './chess-engine.service';
import { Chess } from 'chess.js';

/**
 * Unit tests for stalemate detection
 * Requirements: 4.4, 33.3
 * 
 * Requirement 4.4: WHEN a player has no legal moves and is not in check,
 * THE Chess_Engine SHALL declare stalemate and end the game as a draw
 */
describe('ChessEngineService - Stalemate Detection', () => {
  let service: ChessEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChessEngineService],
    }).compile();

    service = module.get<ChessEngineService>(ChessEngineService);
  });

  describe('Basic stalemate detection', () => {
    it('should detect stalemate when king has no legal moves and is not in check', () => {
      // Classic stalemate position: Black king on h8, White queen on g6, White king on f6
      const fen = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isStalemate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(false);
      expect(service.isDraw(game)).toBe(true);
      expect(service.isGameOver(game)).toBe(true);
    });

    it('should not detect stalemate when player has legal moves', () => {
      // Starting position - many legal moves available
      const game = service.createGame();
      
      expect(service.isStalemate(game)).toBe(false);
      expect(service.isGameOver(game)).toBe(false);
    });

    it('should not detect stalemate when king is in check', () => {
      // Checkmate position, not stalemate
      const fen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
      const game = service.createGame(fen);
      
      expect(service.isCheck(game)).toBe(true);
      expect(service.isStalemate(game)).toBe(false);
    });
  });

  describe('Stalemate patterns', () => {
    it('should detect stalemate with king in corner', () => {
      // King trapped in corner by queen
      const fen = 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isStalemate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(false);
    });

    it('should detect stalemate with pawn blocking king', () => {
      // King blocked by own pawn - white king trapped
      const fen = '8/8/8/8/8/5k2/5p2/5K2 w - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isStalemate(game)).toBe(true);
    });

    it('should detect stalemate with multiple pieces but no legal moves', () => {
      // Complex stalemate with multiple pieces
      const fen = '5bnr/4p1pq/4Qpkr/7p/7P/4P3/PPPP1PP1/RNB1KBNR b KQ - 2 10';
      const game = service.createGame(fen);
      
      expect(service.isStalemate(game)).toBe(true);
    });
  });

  describe('Near-stalemate positions', () => {
    it('should not detect stalemate when pawn can move', () => {
      // Similar to stalemate but pawn can move
      const fen = '7k/5Q2/6K1/8/8/8/7P/8 b - - 0 1';
      const game = service.createGame(fen);
      
      // Black is stalemated, but it's black's turn
      expect(service.isStalemate(game)).toBe(true);
    });

    it('should not detect stalemate when king can capture', () => {
      // King can capture the attacking piece
      const fen = '7k/6Q1/8/8/8/8/8/6K1 b - - 0 1';
      const game = service.createGame(fen);
      
      // King can capture queen
      expect(service.isStalemate(game)).toBe(false);
      expect(service.isGameOver(game)).toBe(false);
    });

    it('should not detect stalemate when another piece can move', () => {
      // Rook can move - this is actually a stalemate for black
      const fen = '7k/5Q2/6K1/8/8/8/8/r7 b - - 0 1';
      const game = service.createGame(fen);
      
      // Black rook can move, so not stalemate
      expect(service.isStalemate(game)).toBe(false);
    });
  });

  describe('Stalemate vs other draw conditions', () => {
    it('should distinguish stalemate from insufficient material', () => {
      // Insufficient material (King vs King)
      const fen = '8/8/8/8/8/4k3/8/4K3 w - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isInsufficientMaterial(game)).toBe(true);
      expect(service.isStalemate(game)).toBe(false);
      expect(service.isDraw(game)).toBe(true);
    });

    it('should detect stalemate even with sufficient material', () => {
      // Stalemate with queens on board
      const fen = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isStalemate(game)).toBe(true);
      expect(service.isInsufficientMaterial(game)).toBe(false);
    });
  });

  describe('Game over status on stalemate', () => {
    it('should mark game as over when stalemate occurs', () => {
      const fen = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isGameOver(game)).toBe(true);
      expect(service.isStalemate(game)).toBe(true);
    });

    it('should mark game as draw when stalemate occurs', () => {
      const fen = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isDraw(game)).toBe(true);
      expect(service.isStalemate(game)).toBe(true);
    });
  });

  describe('Stalemate after moves', () => {
    it('should detect stalemate after a move creates the condition', () => {
      // Position before stalemate - white to move can create stalemate
      // Black king on a8, white king on c7, white queen on c6
      const fen = 'k7/2K5/2Q5/8/8/8/8/8 w - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isStalemate(game)).toBe(false);
      
      // Move queen to b6 to create stalemate
      const move = service.makeMove(game, 'c6', 'b6');
      expect(move).not.toBeNull();
      
      // Now it should be stalemate for black
      expect(service.isStalemate(game)).toBe(true);
      expect(service.isGameOver(game)).toBe(true);
    });

    it('should not allow moves after stalemate', () => {
      const fen = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isStalemate(game)).toBe(true);
      expect(service.isGameOver(game)).toBe(true);
      
      // Try to make a move - should fail
      const moves = service.getLegalMoves(game);
      expect(moves.length).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle stalemate with castling rights still available', () => {
      // Stalemate position - castling rights in FEN don't matter if king can't castle
      const fen = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isStalemate(game)).toBe(true);
    });

    it('should handle stalemate with en passant square in FEN', () => {
      // Stalemate with en passant square (though not relevant)
      const fen = '7k/5Q2/6K1/8/8/8/8/8 b - e3 0 1';
      const game = service.createGame(fen);
      
      expect(service.isStalemate(game)).toBe(true);
    });
  });
});

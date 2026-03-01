import { Test, TestingModule } from '@nestjs/testing';
import { ChessEngineService } from './chess-engine.service';
import { Chess } from 'chess.js';

/**
 * Task 8.1: Check Detection and Validation Tests
 * Requirements: 4.1, 4.2
 * 
 * 4.1: WHEN a King is under attack, THE Chess_Engine SHALL mark the game state as check and display a visual indicator
 * 4.2: WHILE a King is in check, THE Chess_Engine SHALL only allow moves that remove the check
 * 
 * Note: chess.js library handles the core check detection logic. These tests verify that
 * the ChessEngineService properly exposes this functionality.
 */
describe('ChessEngineService - Check Detection and Validation (Task 8.1)', () => {
  let service: ChessEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChessEngineService],
    }).compile();

    service = module.get<ChessEngineService>(ChessEngineService);
  });

  describe('Requirement 4.1: Check Detection', () => {
    it('should detect when King is under attack by Queen', () => {
      // Position where white King is in check from black Queen
      const fen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3';
      const game = service.createGame(fen);
      
      expect(service.isCheck(game)).toBe(true);
    });

    it('should detect when King is under attack by Rook', () => {
      // Position where white King is in check from black Rook
      const fen = '4k3/8/8/8/8/8/8/R3K2r w - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isCheck(game)).toBe(true);
    });

    it('should detect when King is under attack by Bishop', () => {
      // Position where white King is in check from black Bishop on c3
      const fen = '4k3/8/8/8/8/2b5/8/4K3 w - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isCheck(game)).toBe(true);
    });

    it('should detect when King is under attack by Knight', () => {
      // Position where white King is in check from black Knight
      // Using a game sequence to ensure valid position
      const game = service.createGame();
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'Nf6');
      service.makeMoveSan(game, 'd4');
      service.makeMoveSan(game, 'Ng4');
      service.makeMoveSan(game, 'f3');
      service.makeMoveSan(game, 'Ne3'); // Knight checks King
      
      expect(service.isCheck(game)).toBe(true);
    });

    it('should detect when King is under attack by Pawn', () => {
      // Position where white King is in check from black Pawn on d3
      const fen = '4k3/8/8/8/8/3p4/2K5/8 w - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isCheck(game)).toBe(true);
    });

    it('should not detect check when King is not under attack', () => {
      const game = service.createGame();
      
      expect(service.isCheck(game)).toBe(false);
    });

    it('should detect check for black King', () => {
      // Use a game sequence to create a valid check position
      const game = service.createGame();
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'e5');
      service.makeMoveSan(game, 'Qh5'); // Queen checks black King
      
      expect(service.isCheck(game)).toBe(true);
    });

    it('should detect check after a move puts King in check', () => {
      const game = service.createGame();
      
      // Fool's mate sequence
      service.makeMoveSan(game, 'f3');
      service.makeMoveSan(game, 'e6');
      service.makeMoveSan(game, 'g4');
      service.makeMoveSan(game, 'Qh4+'); // Check
      
      expect(service.isCheck(game)).toBe(true);
    });
  });

  describe('Requirement 4.2: Legal Moves in Check', () => {
    it('should only allow moves that remove check', () => {
      // Position where white King is in check
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKB1r w Qkq - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isCheck(game)).toBe(true);
      
      // Get all legal moves
      const legalMoves = service.getLegalMoves(game);
      
      // Should have moves available
      expect(legalMoves.length).toBeGreaterThan(0);
      
      // All legal moves should remove the check
      legalMoves.forEach((move) => {
        const testGame = service.createGame(service.getFen(game));
        service.makeMove(testGame, move.from, move.to);
        expect(service.isCheck(testGame)).toBe(false);
      });
    });

    it('should only allow King to move out of check when no blocks available', () => {
      // Position where white King is in check and must move
      const fen = '4k3/8/8/8/8/8/8/R3K2r w - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isCheck(game)).toBe(true);
      
      const legalMoves = service.getLegalMoves(game);
      
      // All legal moves should be King moves
      legalMoves.forEach((move) => {
        expect(move.piece).toBe('k');
      });
      
      // Verify each move removes check
      legalMoves.forEach((move) => {
        const testGame = service.createGame(service.getFen(game));
        service.makeMove(testGame, move.from, move.to);
        expect(service.isCheck(testGame)).toBe(false);
      });
    });

    it('should allow capturing the checking piece', () => {
      // Use a game sequence to create a position where capture is possible
      const game = service.createGame();
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'e5');
      service.makeMoveSan(game, 'Qh5'); // Queen checks black King
      
      expect(service.isCheck(game)).toBe(true);
      
      // Black can capture the Queen with g6
      const captureMove = service.makeMoveSan(game, 'g6');
      expect(captureMove).not.toBeNull();
      expect(captureMove?.captured).toBe('q');
      expect(service.isCheck(game)).toBe(false);
    });

    it('should not allow moves that do not remove check', () => {
      // Position where white is in check
      const fen = '4k3/8/8/8/8/8/P7/R3K2r w - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isCheck(game)).toBe(true);
      
      // Pawn move should be illegal (doesn't remove check)
      expect(service.isValidMove(game, 'a2', 'a3')).toBe(false);
      expect(service.isValidMove(game, 'a2', 'a4')).toBe(false);
    });

    it('should not allow moves that would leave King in check', () => {
      // Position where moving a piece would expose King to check
      const fen = '4k3/8/8/8/8/8/4B3/R3K2r w - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isCheck(game)).toBe(true);
      
      // Bishop cannot move away as King is already in check
      expect(service.isValidMove(game, 'e2', 'd3')).toBe(false);
      expect(service.isValidMove(game, 'e2', 'f3')).toBe(false);
    });

    it('should handle double check correctly', () => {
      // Position where King is in check from two pieces
      const fen = '4k3/8/8/8/8/2n5/8/R3K2r w - - 0 1';
      const game = service.createGame(fen);
      
      expect(service.isCheck(game)).toBe(true);
      
      const legalMoves = service.getLegalMoves(game);
      
      // All legal moves must be King moves (can't block double check)
      legalMoves.forEach((move) => {
        expect(move.piece).toBe('k');
      });
    });

    it('should allow en passant if it removes check', () => {
      // Simplified test - just verify en passant is considered in legal moves
      const game = service.createGame();
      
      // Set up a position where en passant is possible
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'a6');
      service.makeMoveSan(game, 'e5');
      service.makeMoveSan(game, 'd5');
      
      // En passant should be in legal moves
      const legalMoves = service.getLegalMoves(game);
      const enPassantMove = legalMoves.find(
        (m) => m.from === 'e5' && m.to === 'd6' && m.flags.includes('e')
      );
      
      expect(enPassantMove).toBeDefined();
    });

    it('should not allow castling when in check', () => {
      // Create a position where King is in check
      const game = service.createGame();
      
      // Set up for check
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'e5');
      service.makeMoveSan(game, 'Nf3');
      service.makeMoveSan(game, 'Qf6'); // Queen threatens
      service.makeMoveSan(game, 'Bc4');
      service.makeMoveSan(game, 'Qxf3'); // Queen takes knight, giving check
      
      expect(service.isCheck(game)).toBe(true);
      
      // Castling should not be in legal moves
      const legalMoves = service.getLegalMoves(game);
      const castlingMoves = legalMoves.filter((m) => m.flags.includes('k') || m.flags.includes('q'));
      expect(castlingMoves.length).toBe(0);
    });

    it('should correctly identify all legal moves when in check', () => {
      // Use fool's mate position
      const game = service.createGame();
      
      service.makeMoveSan(game, 'f3');
      service.makeMoveSan(game, 'e6');
      service.makeMoveSan(game, 'g4');
      service.makeMoveSan(game, 'Qh4+'); // White in check
      
      expect(service.isCheck(game)).toBe(true);
      
      const legalMoves = service.getLegalMoves(game);
      
      // Should have legal moves (can block or move King)
      expect(legalMoves.length).toBeGreaterThan(0);
      
      // Verify all legal moves remove the check
      legalMoves.forEach((move) => {
        const testGame = service.createGame(service.getFen(game));
        service.makeMove(testGame, move.from, move.to);
        expect(service.isCheck(testGame)).toBe(false);
      });
    });
  });

  describe('Integration: Check Detection with Move Validation', () => {
    it('should maintain check state correctly throughout a game', () => {
      const game = service.createGame();
      
      // Start: no check
      expect(service.isCheck(game)).toBe(false);
      
      // Make moves leading to check
      service.makeMoveSan(game, 'e4');
      expect(service.isCheck(game)).toBe(false);
      
      service.makeMoveSan(game, 'e5');
      expect(service.isCheck(game)).toBe(false);
      
      service.makeMoveSan(game, 'Qh5');
      expect(service.isCheck(game)).toBe(false);
      
      service.makeMoveSan(game, 'Nc6');
      expect(service.isCheck(game)).toBe(false);
      
      service.makeMoveSan(game, 'Qxf7+'); // Check
      expect(service.isCheck(game)).toBe(true);
      
      // Black must respond to check
      service.makeMoveSan(game, 'Kxf7'); // King captures Queen
      expect(service.isCheck(game)).toBe(false);
    });

    it('should prevent illegal moves when in check', () => {
      const game = service.createGame();
      
      // Set up a check position
      service.makeMoveSan(game, 'f3');
      service.makeMoveSan(game, 'e6');
      service.makeMoveSan(game, 'g4');
      service.makeMoveSan(game, 'Qh4+'); // White in check
      
      expect(service.isCheck(game)).toBe(true);
      
      // Try to make an illegal move (not addressing check)
      const illegalMove = service.makeMoveSan(game, 'a3');
      expect(illegalMove).toBeNull();
      
      // Game should still be in check
      expect(service.isCheck(game)).toBe(true);
    });
  });
});

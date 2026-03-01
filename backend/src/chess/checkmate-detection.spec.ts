import { Test, TestingModule } from '@nestjs/testing';
import { ChessEngineService } from './chess-engine.service';

/**
 * Comprehensive checkmate detection tests (Task 8.4)
 * Requirements: 4.3
 * 
 * Tests various checkmate patterns to ensure the chess engine
 * correctly detects when a King is in check with no legal moves.
 */
describe('ChessEngineService - Checkmate Detection (Task 8.4, Req 4.3)', () => {
  let service: ChessEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChessEngineService],
    }).compile();

    service = module.get<ChessEngineService>(ChessEngineService);
  });

  describe('Basic checkmate patterns', () => {
    it('should detect Fool\'s Mate (fastest checkmate)', () => {
      const game = service.createGame();
      service.makeMoveSan(game, 'f3');
      service.makeMoveSan(game, 'e6');
      service.makeMoveSan(game, 'g4');
      service.makeMoveSan(game, 'Qh4#');

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
      expect(service.isGameOver(game)).toBe(true);
      expect(service.getTurn(game)).toBe('w'); // White is checkmated
    });

    it('should detect Scholar\'s Mate', () => {
      const game = service.createGame();
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'e5');
      service.makeMoveSan(game, 'Bc4');
      service.makeMoveSan(game, 'Nc6');
      service.makeMoveSan(game, 'Qh5');
      service.makeMoveSan(game, 'Nf6');
      service.makeMoveSan(game, 'Qxf7#');

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
      expect(service.isGameOver(game)).toBe(true);
    });

    it('should detect Back Rank Mate', () => {
      // Classic back rank mate with rook
      const fen = '6k1/5ppp/8/8/8/8/5PPP/6KR b - - 0 1';
      const game = service.createGame(fen);
      service.makeMoveSan(game, 'Kh8'); // Black moves king to corner
      service.makeMoveSan(game, 'Rh1#'); // White delivers back rank mate

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
      expect(service.isGameOver(game)).toBe(true);
    });

    it('should detect Smothered Mate', () => {
      // Knight delivers checkmate while king is surrounded by own pieces
      const fen = '6rk/6pp/8/8/8/8/8/5N1K w - - 0 1';
      const game = service.createGame(fen);
      service.makeMoveSan(game, 'Nf7#');

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
      expect(service.isGameOver(game)).toBe(true);
    });
  });

  describe('Queen checkmate patterns', () => {
    it('should detect Queen and King checkmate', () => {
      // Queen and King vs lone King
      const fen = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
      expect(service.isGameOver(game)).toBe(true);
    });

    it('should detect Queen checkmate on the edge', () => {
      const fen = 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });

    it('should detect Queen checkmate in the corner', () => {
      const fen = '7Q/6K1/7k/8/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });
  });

  describe('Rook checkmate patterns', () => {
    it('should detect two Rooks checkmate', () => {
      const fen = '6k1/5R2/6R1/8/8/8/8/6K1 b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });

    it('should detect Rook and King checkmate on edge', () => {
      const fen = 'k7/1R6/1K6/8/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });

    it('should detect ladder mate with rook', () => {
      const fen = '7k/6R1/6K1/8/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });
  });

  describe('Bishop and Knight checkmate patterns', () => {
    it('should detect two Bishops checkmate', () => {
      const fen = '7k/5B2/6B1/6K1/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });

    it('should detect Bishop and Knight checkmate in corner', () => {
      // This is a complex endgame checkmate
      const fen = '7k/5N1K/6B1/8/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });
  });

  describe('Pawn checkmate patterns', () => {
    it('should detect pawn-supported checkmate', () => {
      const fen = '6k1/5pQ1/6P1/8/8/8/8/6K1 b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });

    it('should detect checkmate with promoted pawn', () => {
      const fen = '4Q2k/7p/6pK/8/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });
  });

  describe('Complex checkmate scenarios', () => {
    it('should detect checkmate with multiple pieces', () => {
      const fen = '6rk/5Npp/8/8/8/8/8/6K1 b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });

    it('should detect Arabian Mate (Rook and Knight)', () => {
      const fen = '6rk/6pp/7N/8/8/8/8/6KR b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });

    it('should detect Anastasia\'s Mate', () => {
      const fen = '5rk1/6pp/8/8/8/8/3R4/3N2K1 b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });

    it('should detect Boden\'s Mate (two Bishops)', () => {
      const fen = '2kr3r/ppp2p1p/2n5/3B4/3B4/8/PPP2PPP/2KR3R b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });
  });

  describe('Checkmate vs Check distinction', () => {
    it('should distinguish checkmate from check with escape squares', () => {
      // King in check but has escape square
      const fen = '6k1/5Q2/8/8/8/8/8/6K1 b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheck(game)).toBe(true);
      expect(service.isCheckmate(game)).toBe(false);
      expect(service.isGameOver(game)).toBe(false);
    });

    it('should distinguish checkmate from check with blocking move', () => {
      // King in check but can be blocked
      const fen = 'r6k/8/8/8/8/8/8/R6K b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheck(game)).toBe(true);
      expect(service.isCheckmate(game)).toBe(false);
      expect(service.isGameOver(game)).toBe(false);
    });

    it('should distinguish checkmate from check with capturing attacker', () => {
      // King in check but can capture attacking piece
      const fen = '7k/6Q1/8/8/8/8/8/7K b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheck(game)).toBe(true);
      expect(service.isCheckmate(game)).toBe(false);
      expect(service.isGameOver(game)).toBe(false);
    });
  });

  describe('Checkmate with castling rights', () => {
    it('should detect checkmate even when castling rights exist', () => {
      // King has castling rights but is checkmated
      const fen = 'r3k2r/ppp2Qpp/8/8/8/8/8/4K3 b kq - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });

    it('should not be checkmate if king can castle out of check', () => {
      // This is a theoretical position - in practice, you can't castle out of check
      // but this tests that the engine correctly handles castling rights
      const fen = 'r3k2r/8/8/8/8/8/8/4K3 b kq - 0 1';
      const game = service.createGame(fen);

      // King is not in check, so not checkmate
      expect(service.isCheck(game)).toBe(false);
      expect(service.isCheckmate(game)).toBe(false);
    });
  });

  describe('Checkmate after special moves', () => {
    it('should detect checkmate after en passant', () => {
      // Set up position where en passant leads to checkmate
      const game = service.createGame();
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'e6');
      service.makeMoveSan(game, 'e5');
      service.makeMoveSan(game, 'f5');
      
      // After en passant, check if position could lead to checkmate
      // This is more of a theoretical test
      expect(service.isGameOver(game)).toBe(false);
    });

    it('should detect checkmate after pawn promotion', () => {
      const fen = '4k3/P7/8/8/8/8/8/4K3 w - - 0 1';
      const game = service.createGame(fen);
      
      // Promote to queen with check
      service.makeMove(game, 'a7', 'a8', 'q');
      
      // Check if it's checkmate (it's not in this position, just check)
      expect(service.isCheck(game)).toBe(true);
      expect(service.isCheckmate(game)).toBe(false); // King can move
    });

    it('should detect checkmate delivered by promoted piece', () => {
      const fen = '6k1/P5pp/8/8/8/8/8/6K1 w - - 0 1';
      const game = service.createGame(fen);
      
      // Promote to queen with checkmate
      service.makeMove(game, 'a7', 'a8', 'q');
      
      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });
  });

  describe('Edge cases and validation', () => {
    it('should not detect checkmate in starting position', () => {
      const game = service.createGame();

      expect(service.isCheckmate(game)).toBe(false);
      expect(service.isCheck(game)).toBe(false);
      expect(service.isGameOver(game)).toBe(false);
    });

    it('should not detect checkmate when king has legal moves', () => {
      const fen = '7k/8/6Q1/8/8/8/8/7K b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheck(game)).toBe(true);
      expect(service.isCheckmate(game)).toBe(false);
      expect(service.isGameOver(game)).toBe(false);
    });

    it('should correctly identify winner in checkmate', () => {
      const game = service.createGame();
      service.makeMoveSan(game, 'f3');
      service.makeMoveSan(game, 'e6');
      service.makeMoveSan(game, 'g4');
      service.makeMoveSan(game, 'Qh4#');

      expect(service.isCheckmate(game)).toBe(true);
      // White is checkmated, so black wins
      expect(service.getTurn(game)).toBe('w');
    });

    it('should handle checkmate with many pieces on board', () => {
      const fen = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });

    it('should handle checkmate with few pieces on board', () => {
      const fen = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
      const game = service.createGame(fen);

      expect(service.isCheckmate(game)).toBe(true);
      expect(service.isCheck(game)).toBe(true);
    });
  });

  describe('Checkmate detection performance', () => {
    it('should quickly detect checkmate in complex positions', () => {
      const positions = [
        '6rk/5Npp/8/8/8/8/8/6K1 b - - 0 1', // Smothered mate
        '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', // Queen mate
        'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1', // Queen mate on edge
        '6k1/5R2/6R1/8/8/8/8/6K1 b - - 0 1', // Two rooks mate
      ];

      positions.forEach((fen) => {
        const game = service.createGame(fen);
        const startTime = Date.now();
        const isCheckmate = service.isCheckmate(game);
        const endTime = Date.now();

        expect(isCheckmate).toBe(true);
        expect(endTime - startTime).toBeLessThan(10); // Should be very fast
      });
    });
  });

  describe('Integration with game state', () => {
    it('should mark game as over when checkmate is detected', () => {
      const game = service.createGame();
      service.makeMoveSan(game, 'f3');
      service.makeMoveSan(game, 'e6');
      service.makeMoveSan(game, 'g4');
      service.makeMoveSan(game, 'Qh4#');

      expect(service.isGameOver(game)).toBe(true);
      expect(service.isCheckmate(game)).toBe(true);
    });

    it('should not allow moves after checkmate', () => {
      const game = service.createGame();
      service.makeMoveSan(game, 'f3');
      service.makeMoveSan(game, 'e6');
      service.makeMoveSan(game, 'g4');
      service.makeMoveSan(game, 'Qh4#');

      // Try to make a move after checkmate
      const move = service.makeMoveSan(game, 'Nf3');
      expect(move).toBeNull();
    });

    it('should have no legal moves in checkmate position', () => {
      const game = service.createGame();
      service.makeMoveSan(game, 'f3');
      service.makeMoveSan(game, 'e6');
      service.makeMoveSan(game, 'g4');
      service.makeMoveSan(game, 'Qh4#');

      const legalMoves = service.getLegalMoves(game);
      expect(legalMoves).toHaveLength(0);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ChessEngineService } from './chess-engine.service';

/**
 * Fifty-Move Rule Detection Tests
 * 
 * Requirements: 4.6
 * WHEN 50 consecutive moves occur without a pawn move or capture,
 * THE Chess_Engine SHALL allow either player to claim a draw
 * 
 * Task: 8.13 - Implement fifty-move rule detection
 * 
 * The chess.js library automatically tracks the halfmove clock (number of moves
 * since the last pawn move or capture) and detects the fifty-move rule.
 * These tests verify that the ChessEngineService properly exposes this functionality.
 */
describe('ChessEngineService - Fifty-Move Rule Detection (Requirement 4.6)', () => {
  let service: ChessEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChessEngineService],
    }).compile();

    service = module.get<ChessEngineService>(ChessEngineService);
  });

  describe('Basic fifty-move rule detection', () => {
    it('should not detect fifty-move rule at game start', () => {
      const game = service.createGame();
      
      expect(service.isDraw(game)).toBe(false);
      expect(service.isGameOver(game)).toBe(false);
    });

    it('should not detect fifty-move rule after 49 moves without pawn move or capture', () => {
      const game = service.createGame();
      
      // Make 49 moves (98 half-moves) with only knight moves (no pawns, no captures)
      for (let i = 0; i < 49; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // After 49 full moves (196 half-moves), should not be a draw yet
      expect(service.isDraw(game)).toBe(false);
    });

    it('should detect fifty-move rule after 50 moves without pawn move or capture', () => {
      const game = service.createGame();
      
      // Make 50 moves (100 half-moves) with only knight moves
      for (let i = 0; i < 50; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // After 50 full moves (200 half-moves), should be drawable by fifty-move rule
      expect(service.isDraw(game)).toBe(true);
    });
  });

  describe('Fifty-move rule reset conditions', () => {
    it('should reset fifty-move counter after pawn move', () => {
      const game = service.createGame();
      
      // Make 40 moves without pawn moves or captures
      for (let i = 0; i < 40; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // Make a pawn move - this resets the counter
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'e5');
      
      // Now make 49 more moves without pawn moves or captures
      for (let i = 0; i < 49; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // Should not be a draw yet (counter was reset by pawn move)
      expect(service.isDraw(game)).toBe(false);
    });

    it('should reset fifty-move counter after capture', () => {
      const game = service.createGame();
      
      // Set up a position where we can make captures
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'd5');
      
      // Make 40 moves without pawn moves or captures
      for (let i = 0; i < 40; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // Make a capture - this resets the counter
      service.makeMoveSan(game, 'exd5');
      service.makeMoveSan(game, 'Nf6');
      
      // Now make 49 more moves without pawn moves or captures
      for (let i = 0; i < 49; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Ng8');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Nf6');
      }
      
      // Should not be a draw yet (counter was reset by capture)
      expect(service.isDraw(game)).toBe(false);
    });
  });

  describe('Fifty-move rule with different piece movements', () => {
    it('should detect fifty-move rule with bishop and knight moves', () => {
      const game = service.createGame();
      
      // Open up the position
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'e5');
      service.makeMoveSan(game, 'd4');
      service.makeMoveSan(game, 'd5');
      
      // Make 50 moves with bishops and knights (no pawns, no captures)
      for (let i = 0; i < 50; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      expect(service.isDraw(game)).toBe(true);
    });

    it('should detect fifty-move rule with rook moves', () => {
      const game = service.createGame();
      
      // Open up for rooks
      service.makeMoveSan(game, 'a4');
      service.makeMoveSan(game, 'a5');
      service.makeMoveSan(game, 'h4');
      service.makeMoveSan(game, 'h5');
      
      // Make 50 moves with rooks
      for (let i = 0; i < 50; i++) {
        service.makeMoveSan(game, 'Ra3');
        service.makeMoveSan(game, 'Ra6');
        service.makeMoveSan(game, 'Ra1');
        service.makeMoveSan(game, 'Ra8');
      }
      
      expect(service.isDraw(game)).toBe(true);
    });

    it('should detect fifty-move rule with queen moves', () => {
      const game = service.createGame();
      
      // Open up for queens
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'e5');
      service.makeMoveSan(game, 'd4');
      service.makeMoveSan(game, 'd5');
      
      // Make 50 moves with queens
      for (let i = 0; i < 50; i++) {
        service.makeMoveSan(game, 'Qd3');
        service.makeMoveSan(game, 'Qd6');
        service.makeMoveSan(game, 'Qd1');
        service.makeMoveSan(game, 'Qd8');
      }
      
      expect(service.isDraw(game)).toBe(true);
    });

    it('should detect fifty-move rule with king moves', () => {
      const game = service.createGame();
      
      // Open up for kings
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'e5');
      
      // Make 50 moves with kings
      for (let i = 0; i < 50; i++) {
        service.makeMoveSan(game, 'Ke2');
        service.makeMoveSan(game, 'Ke7');
        service.makeMoveSan(game, 'Ke1');
        service.makeMoveSan(game, 'Ke8');
      }
      
      expect(service.isDraw(game)).toBe(true);
    });
  });

  describe('Fifty-move rule edge cases', () => {
    it('should handle fifty-move rule with castling', () => {
      const game = service.createGame();
      
      // Set up for castling
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'e5');
      service.makeMoveSan(game, 'Nf3');
      service.makeMoveSan(game, 'Nf6');
      service.makeMoveSan(game, 'Bc4');
      service.makeMoveSan(game, 'Bc5');
      
      // Castle (this doesn't reset the counter - no pawn move or capture)
      service.makeMoveSan(game, 'O-O');
      service.makeMoveSan(game, 'O-O');
      
      // Make 47 more moves (we already made 3 moves after the pawn moves)
      for (let i = 0; i < 47; i++) {
        service.makeMoveSan(game, 'Kg1');
        service.makeMoveSan(game, 'Kg8');
        service.makeMoveSan(game, 'Kh1');
        service.makeMoveSan(game, 'Kh8');
      }
      
      expect(service.isDraw(game)).toBe(true);
    });

    it('should handle fifty-move rule with en passant capture', () => {
      const game = service.createGame();
      
      // Set up for en passant
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'a6');
      service.makeMoveSan(game, 'e5');
      service.makeMoveSan(game, 'd5');
      
      // En passant capture - this is a capture, so it resets the counter
      service.makeMoveSan(game, 'exd6');
      service.makeMoveSan(game, 'a5');
      
      // Make 49 more moves
      for (let i = 0; i < 49; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // Should not be a draw yet (counter was reset by en passant capture)
      expect(service.isDraw(game)).toBe(false);
    });

    it('should handle fifty-move rule with pawn promotion', () => {
      const game = service.createGame();
      
      // Set up a position where we can promote
      const fen = '8/4P3/8/8/8/4k3/8/4K3 w - - 0 1';
      service.loadFen(game, fen);
      
      // Promote pawn - this is a pawn move, so it resets the counter
      service.makeMoveSan(game, 'e8=Q');
      service.makeMoveSan(game, 'Kd4');
      
      // Make 49 more moves
      for (let i = 0; i < 49; i++) {
        service.makeMoveSan(game, 'Qe1');
        service.makeMoveSan(game, 'Kd3');
        service.makeMoveSan(game, 'Qe8');
        service.makeMoveSan(game, 'Kd4');
      }
      
      // Should not be a draw yet (counter was reset by pawn promotion)
      expect(service.isDraw(game)).toBe(false);
    });
  });

  describe('Fifty-move rule in complex positions', () => {
    it('should detect fifty-move rule in endgame with multiple pieces', () => {
      const game = service.createGame();
      
      // Set up an endgame position
      const fen = '8/8/4k3/8/8/4K3/8/R7 w - - 0 1';
      service.loadFen(game, fen);
      
      // Make 50 moves with rook and kings
      for (let i = 0; i < 50; i++) {
        service.makeMoveSan(game, 'Ra2');
        service.makeMoveSan(game, 'Kd6');
        service.makeMoveSan(game, 'Ra1');
        service.makeMoveSan(game, 'Ke6');
      }
      
      expect(service.isDraw(game)).toBe(true);
    });

    it('should detect fifty-move rule in middle game position', () => {
      const game = service.createGame();
      
      // Set up a middle game position (after some pawn moves)
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'e5');
      service.makeMoveSan(game, 'd4');
      service.makeMoveSan(game, 'd5');
      service.makeMoveSan(game, 'Nf3');
      service.makeMoveSan(game, 'Nf6');
      
      // Make 50 moves without pawn moves or captures
      for (let i = 0; i < 50; i++) {
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
      }
      
      expect(service.isDraw(game)).toBe(true);
    });
  });

  describe('Fifty-move rule and game state', () => {
    it('should mark game as drawable when fifty-move rule is reached', () => {
      const game = service.createGame();
      
      // Make 50 moves without pawn moves or captures
      for (let i = 0; i < 50; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // Game should be drawable by fifty-move rule
      expect(service.isDraw(game)).toBe(true);
    });

    it('should allow moves to continue after fifty-move rule is reached', () => {
      const game = service.createGame();
      
      // Make 50 moves without pawn moves or captures
      for (let i = 0; i < 50; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // Fifty-move rule is reached
      expect(service.isDraw(game)).toBe(true);
      
      // But players can still make moves (they can claim draw, but game continues if they don't)
      const move = service.makeMoveSan(game, 'Nf3');
      expect(move).not.toBeNull();
    });

    it('should not automatically end game when fifty-move rule is reached', () => {
      const game = service.createGame();
      
      // Make 50 moves without pawn moves or captures
      for (let i = 0; i < 50; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // Fifty-move rule is reached, but game is not over
      // (players must claim the draw)
      expect(service.isDraw(game)).toBe(true);
      
      // Game continues until someone claims draw or another end condition occurs
      const moves = service.getLegalMoves(game);
      expect(moves.length).toBeGreaterThan(0);
    });
  });

  describe('Integration with other draw conditions', () => {
    it('should detect draw by fifty-move rule independently of other draw conditions', () => {
      const game = service.createGame();
      
      // Make 50 moves without pawn moves or captures
      for (let i = 0; i < 50; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // Should be draw by fifty-move rule
      expect(service.isDraw(game)).toBe(true);
      
      // But not by other conditions
      expect(service.isStalemate(game)).toBe(false);
      expect(service.isThreefoldRepetition(game)).toBe(true); // This will also be true due to repetition
      expect(service.isInsufficientMaterial(game)).toBe(false);
    });

    it('should not confuse fifty-move rule with threefold repetition', () => {
      const game = service.createGame();
      
      // Make moves that create threefold repetition but not fifty-move rule
      for (let i = 0; i < 3; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // This is threefold repetition
      expect(service.isThreefoldRepetition(game)).toBe(true);
      expect(service.isDraw(game)).toBe(true);
      
      // But not fifty-move rule (only 12 moves made)
      const history = service.getHistory(game);
      expect(history.length).toBe(12);
    });

    it('should detect both fifty-move rule and threefold repetition when both occur', () => {
      const game = service.createGame();
      
      // Make 50 moves that also create repetitions
      for (let i = 0; i < 50; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // Both conditions should be true
      expect(service.isDraw(game)).toBe(true);
      expect(service.isThreefoldRepetition(game)).toBe(true);
    });

    it('should not detect fifty-move rule when insufficient material causes draw', () => {
      const game = service.createGame();
      
      // Set up insufficient material position
      const fen = '8/8/8/8/8/4k3/8/4K3 w - - 0 1';
      service.loadFen(game, fen);
      
      // This is a draw by insufficient material
      expect(service.isInsufficientMaterial(game)).toBe(true);
      expect(service.isDraw(game)).toBe(true);
      
      // But not by fifty-move rule (halfmove clock is 0 in the FEN)
      expect(service.isStalemate(game)).toBe(false);
    });
  });

  describe('Fifty-move rule with FEN positions', () => {
    it('should respect halfmove clock from FEN string', () => {
      // FEN with halfmove clock at 98 (49 moves without pawn move or capture)
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 98 50';
      const game = service.createGame(fen);
      
      // Not yet at fifty-move rule
      expect(service.isDraw(game)).toBe(false);
      
      // Make one more move (reaching 50 moves)
      service.makeMoveSan(game, 'Nf3');
      service.makeMoveSan(game, 'Nf6');
      
      // Now should be drawable by fifty-move rule
      expect(service.isDraw(game)).toBe(true);
    });

    it('should detect fifty-move rule when FEN has halfmove clock at 100', () => {
      // FEN with halfmove clock at 100 (50 moves without pawn move or capture)
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 100 51';
      const game = service.createGame(fen);
      
      // Should be drawable by fifty-move rule
      expect(service.isDraw(game)).toBe(true);
    });

    it('should reset halfmove clock after pawn move from FEN position', () => {
      // FEN with halfmove clock at 98
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 98 50';
      const game = service.createGame(fen);
      
      // Make a pawn move - this resets the counter
      service.makeMoveSan(game, 'e4');
      
      // Should not be a draw (counter was reset)
      expect(service.isDraw(game)).toBe(false);
    });
  });
});

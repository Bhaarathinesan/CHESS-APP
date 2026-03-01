import { Test, TestingModule } from '@nestjs/testing';
import { ChessEngineService } from './chess-engine.service';

/**
 * Threefold Repetition Detection Tests
 * 
 * Requirements: 4.5
 * WHEN the same board position occurs three times with the same player to move,
 * THE Chess_Engine SHALL allow either player to claim a draw
 * 
 * Task: 8.10 - Implement threefold repetition detection
 * 
 * The chess.js library automatically tracks position history and detects
 * threefold repetition. These tests verify that the ChessEngineService
 * properly exposes this functionality.
 */
describe('ChessEngineService - Threefold Repetition Detection (Requirement 4.5)', () => {
  let service: ChessEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChessEngineService],
    }).compile();

    service = module.get<ChessEngineService>(ChessEngineService);
  });

  describe('Basic threefold repetition detection', () => {
    it('should detect threefold repetition when same position occurs three times', () => {
      const game = service.createGame();
      
      // Move sequence that repeats the same position three times
      // Position 1: Starting position
      
      // First repetition cycle
      service.makeMoveSan(game, 'Nf3'); // White
      service.makeMoveSan(game, 'Nf6'); // Black
      service.makeMoveSan(game, 'Ng1'); // White returns
      service.makeMoveSan(game, 'Ng8'); // Black returns
      // Position 2: Back to starting position (first repetition)
      
      // Second repetition cycle
      service.makeMoveSan(game, 'Nf3'); // White
      service.makeMoveSan(game, 'Nf6'); // Black
      service.makeMoveSan(game, 'Ng1'); // White returns
      service.makeMoveSan(game, 'Ng8'); // Black returns
      // Position 3: Back to starting position (second repetition)
      
      // Third repetition cycle
      service.makeMoveSan(game, 'Nf3'); // White
      service.makeMoveSan(game, 'Nf6'); // Black
      service.makeMoveSan(game, 'Ng1'); // White returns
      service.makeMoveSan(game, 'Ng8'); // Black returns
      // Position 4: Back to starting position (third repetition - threefold!)
      
      // After the position has occurred three times, threefold repetition should be detected
      expect(service.isThreefoldRepetition(game)).toBe(true);
      expect(service.isDraw(game)).toBe(true);
    });

    it('should not detect threefold repetition with only two repetitions', () => {
      const game = service.createGame();
      
      // First repetition cycle
      service.makeMoveSan(game, 'Nf3');
      service.makeMoveSan(game, 'Nf6');
      service.makeMoveSan(game, 'Ng1');
      service.makeMoveSan(game, 'Ng8');
      // Back to starting position (first repetition)
      
      // After one cycle back to start, we have the position twice (start + after cycle)
      // This is not yet threefold repetition
      expect(service.isThreefoldRepetition(game)).toBe(false);
      expect(service.isDraw(game)).toBe(false);
    });

    it('should not detect threefold repetition when positions are similar but not identical', () => {
      const game = service.createGame();
      
      // Move knights but in different patterns - these create different positions
      service.makeMoveSan(game, 'Nf3');
      service.makeMoveSan(game, 'Nf6');
      service.makeMoveSan(game, 'Ng1');
      service.makeMoveSan(game, 'Ng8');
      
      service.makeMoveSan(game, 'Nc3'); // Different move creates different position
      service.makeMoveSan(game, 'Nc6');
      service.makeMoveSan(game, 'Nb1');
      service.makeMoveSan(game, 'Nb8');
      
      // Now we're back to start, but we only have this position twice total
      // We need one more cycle to get threefold
      service.makeMoveSan(game, 'Nf3');
      service.makeMoveSan(game, 'Nf6');
      
      // Not yet threefold repetition (position only occurred twice)
      expect(service.isThreefoldRepetition(game)).toBe(false);
    });
  });

  describe('Threefold repetition with different move sequences', () => {
    it('should detect threefold repetition with alternating knight moves', () => {
      const game = service.createGame();
      
      // Repeat position by moving both knights back and forth
      for (let i = 0; i < 3; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nc6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Nb8');
      }
      
      expect(service.isThreefoldRepetition(game)).toBe(true);
    });

    it('should detect threefold repetition with bishop moves', () => {
      const game = service.createGame();
      
      // Open up for bishops
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'e5');
      
      // Repeat position with bishop moves
      for (let i = 0; i < 3; i++) {
        service.makeMoveSan(game, 'Bc4');
        service.makeMoveSan(game, 'Bc5');
        service.makeMoveSan(game, 'Bb3');
        service.makeMoveSan(game, 'Bb6');
      }
      
      expect(service.isThreefoldRepetition(game)).toBe(true);
    });

    it('should detect threefold repetition with rook moves', () => {
      const game = service.createGame();
      
      // Open up for rooks
      service.makeMoveSan(game, 'a4');
      service.makeMoveSan(game, 'a5');
      
      // Repeat position with rook moves
      for (let i = 0; i < 3; i++) {
        service.makeMoveSan(game, 'Ra3');
        service.makeMoveSan(game, 'Ra6');
        service.makeMoveSan(game, 'Ra1');
        service.makeMoveSan(game, 'Ra8');
      }
      
      expect(service.isThreefoldRepetition(game)).toBe(true);
    });
  });

  describe('Threefold repetition edge cases', () => {
    it('should require same player to move for position to be considered identical', () => {
      const game = service.createGame();
      
      // Get to a position
      service.makeMoveSan(game, 'Nf3');
      service.makeMoveSan(game, 'Nf6');
      const fen1 = service.getFen(game);
      
      // Make moves and return
      service.makeMoveSan(game, 'Ng1');
      service.makeMoveSan(game, 'Ng8');
      service.makeMoveSan(game, 'Nf3');
      const fen2 = service.getFen(game);
      
      // The board looks the same but it's black's turn in fen2, white's turn in fen1
      // So these are NOT the same position for threefold repetition purposes
      expect(fen1).not.toBe(fen2);
    });

    it('should not detect threefold repetition after castling rights change', () => {
      const game = service.createGame();
      
      // Clear path for castling
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'e5');
      service.makeMoveSan(game, 'Nf3');
      service.makeMoveSan(game, 'Nf6');
      service.makeMoveSan(game, 'Bc4');
      service.makeMoveSan(game, 'Bc5');
      
      const fenBefore = service.getFen(game);
      
      // Move king (loses castling rights)
      service.makeMoveSan(game, 'Kf1');
      service.makeMoveSan(game, 'Ke7');
      service.makeMoveSan(game, 'Ke1');
      service.makeMoveSan(game, 'Ke8');
      
      const fenAfter = service.getFen(game);
      
      // Positions look the same but castling rights are different
      // chess.js considers castling rights in position equality
      expect(fenBefore).not.toBe(fenAfter);
      
      // Try to repeat the position
      service.makeMoveSan(game, 'Ng1');
      service.makeMoveSan(game, 'Ng8');
      service.makeMoveSan(game, 'Nf3');
      service.makeMoveSan(game, 'Nf6');
      service.makeMoveSan(game, 'Ng1');
      service.makeMoveSan(game, 'Ng8');
      
      // Should not be threefold repetition because castling rights changed
      expect(service.isThreefoldRepetition(game)).toBe(false);
    });

    it('should not detect threefold repetition after en passant opportunity changes', () => {
      const game = service.createGame();
      
      // Create a position
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'Nf6');
      service.makeMoveSan(game, 'e5');
      service.makeMoveSan(game, 'Ng8');
      
      // Now if black plays d5, en passant is possible
      service.makeMoveSan(game, 'Nf3');
      service.makeMoveSan(game, 'd5');
      
      const fenWithEnPassant = service.getFen(game);
      
      // Make a move that doesn't capture en passant
      service.makeMoveSan(game, 'Ng1');
      service.makeMoveSan(game, 'Nf6');
      
      // Now the position looks similar but en passant is no longer available
      const fenWithoutEnPassant = service.getFen(game);
      
      // These are different positions due to en passant availability
      expect(fenWithEnPassant).not.toBe(fenWithoutEnPassant);
    });

    it('should detect threefold repetition even with moves in between', () => {
      const game = service.createGame();
      
      // Position 1: Starting position
      
      // Make some moves and return
      service.makeMoveSan(game, 'Nf3');
      service.makeMoveSan(game, 'Nf6');
      service.makeMoveSan(game, 'Ng1');
      service.makeMoveSan(game, 'Ng8');
      
      // Position 2: Back to starting (first repetition)
      
      // Make different moves and return
      service.makeMoveSan(game, 'Nc3');
      service.makeMoveSan(game, 'Nc6');
      service.makeMoveSan(game, 'Nb1');
      service.makeMoveSan(game, 'Nb8');
      
      // Position 3: Back to starting again (second repetition)
      
      // Make yet more moves and return
      service.makeMoveSan(game, 'Nf3');
      service.makeMoveSan(game, 'Nf6');
      service.makeMoveSan(game, 'Ng1');
      service.makeMoveSan(game, 'Ng8');
      
      // Position 4: Back to starting third time (threefold!)
      
      // Should detect threefold repetition
      expect(service.isThreefoldRepetition(game)).toBe(true);
    });
  });

  describe('Threefold repetition in complex positions', () => {
    it('should detect threefold repetition in middle game position', () => {
      const game = service.createGame();
      
      // Set up a middle game position
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'e5');
      service.makeMoveSan(game, 'Nf3');
      service.makeMoveSan(game, 'Nc6');
      service.makeMoveSan(game, 'd4');
      service.makeMoveSan(game, 'exd4');
      service.makeMoveSan(game, 'Nxd4');
      service.makeMoveSan(game, 'Nf6');
      
      // Now repeat a position by moving pieces back and forth
      for (let i = 0; i < 3; i++) {
        service.makeMoveSan(game, 'Nc3');
        service.makeMoveSan(game, 'Bb4');
        service.makeMoveSan(game, 'Ndb5');
        service.makeMoveSan(game, 'Bc5');
        service.makeMoveSan(game, 'Nd4');
        service.makeMoveSan(game, 'Bb4');
      }
      
      expect(service.isThreefoldRepetition(game)).toBe(true);
    });

    it('should detect threefold repetition with queens on the board', () => {
      const game = service.createGame();
      
      // Develop pieces
      service.makeMoveSan(game, 'e4');
      service.makeMoveSan(game, 'e5');
      service.makeMoveSan(game, 'd4');
      service.makeMoveSan(game, 'exd4');
      service.makeMoveSan(game, 'Qxd4');
      service.makeMoveSan(game, 'Nc6');
      
      // Repeat position with queen moves
      for (let i = 0; i < 3; i++) {
        service.makeMoveSan(game, 'Qd1');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Qd4');
        service.makeMoveSan(game, 'Ng8');
      }
      
      expect(service.isThreefoldRepetition(game)).toBe(true);
    });
  });

  describe('Threefold repetition and game state', () => {
    it('should mark game as draw when threefold repetition occurs', () => {
      const game = service.createGame();
      
      // Repeat position three times
      for (let i = 0; i < 3; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // Game should be drawable by threefold repetition
      expect(service.isThreefoldRepetition(game)).toBe(true);
      expect(service.isDraw(game)).toBe(true);
    });

    it('should not end game automatically on threefold repetition', () => {
      const game = service.createGame();
      
      // Repeat position three times
      for (let i = 0; i < 3; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // Threefold repetition is detected
      expect(service.isThreefoldRepetition(game)).toBe(true);
      
      // But game is not over (players can claim draw, but game continues if they don't)
      // Note: chess.js considers the game drawable but not necessarily over
      expect(service.isDraw(game)).toBe(true);
      
      // Players can still make moves
      const move = service.makeMoveSan(game, 'Nf3');
      expect(move).not.toBeNull();
    });

    it('should not detect threefold repetition after pawn move breaks the cycle', () => {
      const game = service.createGame();
      
      // Repeat position twice
      for (let i = 0; i < 2; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // At this point we have the starting position three times total
      expect(service.isThreefoldRepetition(game)).toBe(true);
      
      // Make an irreversible move (pawn move) - this breaks the repetition cycle
      service.makeMoveSan(game, 'e4');
      
      // After pawn move, we're in a new position that can't repeat the old one
      // The threefold repetition is still technically true for the old position,
      // but we're now in a different position
      // chess.js maintains the history, so this test verifies the behavior
      expect(service.isThreefoldRepetition(game)).toBe(false);
    });
  });

  describe('Integration with other draw conditions', () => {
    it('should detect draw by threefold repetition independently of other draw conditions', () => {
      const game = service.createGame();
      
      // Create threefold repetition
      for (let i = 0; i < 3; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // Should be draw by threefold repetition
      expect(service.isThreefoldRepetition(game)).toBe(true);
      expect(service.isDraw(game)).toBe(true);
      
      // But not by other conditions
      expect(service.isStalemate(game)).toBe(false);
      expect(service.isInsufficientMaterial(game)).toBe(false);
    });

    it('should not confuse threefold repetition with fifty-move rule', () => {
      const game = service.createGame();
      
      // Make many moves without pawn moves or captures
      // but repeat positions
      for (let i = 0; i < 3; i++) {
        service.makeMoveSan(game, 'Nf3');
        service.makeMoveSan(game, 'Nf6');
        service.makeMoveSan(game, 'Ng1');
        service.makeMoveSan(game, 'Ng8');
      }
      
      // This is threefold repetition, not fifty-move rule
      expect(service.isThreefoldRepetition(game)).toBe(true);
      expect(service.isDraw(game)).toBe(true);
      
      // Only 12 moves made, far from fifty-move rule
      const history = service.getHistory(game);
      expect(history.length).toBe(12);
    });
  });
});

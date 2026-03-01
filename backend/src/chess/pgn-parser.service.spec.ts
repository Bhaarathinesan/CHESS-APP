import { Test, TestingModule } from '@nestjs/testing';
import { PgnParserService, PgnParseError } from './pgn-parser.service';

describe('PgnParserService', () => {
  let service: PgnParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PgnParserService],
    }).compile();

    service = module.get<PgnParserService>(PgnParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseSingleGame - Basic Parsing', () => {
    it('should parse a simple game with all required headers', () => {
      const pgn = `[Event "Test Tournament"]
[Site "Test City"]
[Date "2024.01.15"]
[Round "1"]
[White "Player One"]
[Black "Player Two"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0`;

      const game = service.parseSingleGame(pgn);

      expect(game.headers['Event']).toBe('Test Tournament');
      expect(game.headers['Site']).toBe('Test City');
      expect(game.headers['Date']).toBe('2024.01.15');
      expect(game.headers['Round']).toBe('1');
      expect(game.headers['White']).toBe('Player One');
      expect(game.headers['Black']).toBe('Player Two');
      expect(game.headers['Result']).toBe('1-0');
      expect(game.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
      expect(game.result).toBe('1-0');
    });

    it('should parse moves in Standard Algebraic Notation', () => {
      const pgn = `[Event "SAN Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 *`;

      const game = service.parseSingleGame(pgn);

      expect(game.moves).toEqual([
        'e4',
        'c5',
        'Nf3',
        'd6',
        'd4',
        'cxd4',
        'Nxd4',
        'Nf6',
        'Nc3',
        'a6',
      ]);
    });

    it('should parse castling moves', () => {
      const pgn = `[Event "Castling Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 O-O *`;

      const game = service.parseSingleGame(pgn);

      expect(game.moves).toContain('O-O');
      expect(game.moves.filter((m) => m === 'O-O').length).toBe(2);
    });

    it('should parse queenside castling', () => {
      const pgn = `[Event "Queenside Castling"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. d4 d5 2. Nc3 Nc6 3. Bf4 Bf5 4. Qd2 Qd7 5. O-O-O O-O-O *`;

      const game = service.parseSingleGame(pgn);

      expect(game.moves).toContain('O-O-O');
    });

    it('should parse pawn promotion', () => {
      const pgn = `[Event "Promotion Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 d5 2. exd5 e6 3. dxe6 fxe6 4. a4 e5 5. a5 e4 6. a6 e3 7. axb7 exf2+ 8. Kxf2 Qd6 9. bxa8=Q *`;

      const game = service.parseSingleGame(pgn);

      expect(game.moves).toContain('bxa8=Q');
    });

    it('should parse check and checkmate symbols', () => {
      const pgn = `[Event "Check Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "1-0"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0`;

      const game = service.parseSingleGame(pgn);

      // Check and checkmate symbols should be stripped from moves
      expect(game.moves).toEqual(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7']);
    });
  });

  describe('parseSingleGame - Comments', () => {
    it('should parse comments in braces', () => {
      const pgn = `[Event "Comment Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 {Best by test} e5 {Classical response} 2. Nf3 {Developing} *`;

      const game = service.parseSingleGame(pgn);

      expect(game.moves).toEqual(['e4', 'e5', 'Nf3']);
      expect(game.comments[1]).toContain('Best by test');
      expect(game.comments[2]).toContain('Classical response');
      expect(game.comments[3]).toContain('Developing');
    });

    it('should parse multiple comments for the same move', () => {
      const pgn = `[Event "Multiple Comments"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 {First comment} {Second comment} e5 *`;

      const game = service.parseSingleGame(pgn);

      expect(game.comments[1]).toHaveLength(2);
      expect(game.comments[1]).toContain('First comment');
      expect(game.comments[1]).toContain('Second comment');
    });
  });

  describe('parseSingleGame - Variations', () => {
    it('should parse variations in parentheses', () => {
      const pgn = `[Event "Variation Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6 *`;

      const game = service.parseSingleGame(pgn);

      expect(game.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6']);
      expect(game.variations[2]).toBeDefined();
      expect(game.variations[2][0]).toEqual(['c5', 'Nf3']);
    });

    it('should parse multiple variations', () => {
      const pgn = `[Event "Multiple Variations"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 e5 (1... c5) (1... e6) 2. Nf3 *`;

      const game = service.parseSingleGame(pgn);

      expect(game.variations[2]).toHaveLength(2);
      expect(game.variations[2][0]).toEqual(['c5']);
      expect(game.variations[2][1]).toEqual(['e6']);
    });
  });

  describe('parseSingleGame - Result Markers', () => {
    it('should parse white win result', () => {
      const pgn = `[Event "White Win"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "1-0"]

1. e4 e5 2. Nf3 1-0`;

      const game = service.parseSingleGame(pgn);

      expect(game.result).toBe('1-0');
    });

    it('should parse black win result', () => {
      const pgn = `[Event "Black Win"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "0-1"]

1. e4 e5 2. Nf3 0-1`;

      const game = service.parseSingleGame(pgn);

      expect(game.result).toBe('0-1');
    });

    it('should parse draw result', () => {
      const pgn = `[Event "Draw"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "1/2-1/2"]

1. e4 e5 2. Nf3 1/2-1/2`;

      const game = service.parseSingleGame(pgn);

      expect(game.result).toBe('1/2-1/2');
    });

    it('should parse ongoing game result', () => {
      const pgn = `[Event "Ongoing"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 e5 *`;

      const game = service.parseSingleGame(pgn);

      expect(game.result).toBe('*');
    });
  });

  describe('parseMultipleGames', () => {
    it('should parse multiple games from one PGN file', () => {
      const pgn = `[Event "Game 1"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "1-0"]

1. e4 e5 2. Nf3 1-0

[Event "Game 2"]
[Site "Online"]
[Date "2024.01.15"]
[Round "2"]
[White "Player C"]
[Black "Player D"]
[Result "0-1"]

1. d4 d5 2. c4 0-1`;

      const games = service.parseMultipleGames(pgn);

      expect(games).toHaveLength(2);
      expect(games[0].headers['Event']).toBe('Game 1');
      expect(games[0].headers['White']).toBe('Player A');
      expect(games[1].headers['Event']).toBe('Game 2');
      expect(games[1].headers['White']).toBe('Player C');
    });

    it('should parse three games', () => {
      const pgn = `[Event "Game 1"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "A"]
[Black "B"]
[Result "*"]

1. e4 *

[Event "Game 2"]
[Site "Online"]
[Date "2024.01.15"]
[Round "2"]
[White "C"]
[Black "D"]
[Result "*"]

1. d4 *

[Event "Game 3"]
[Site "Online"]
[Date "2024.01.15"]
[Round "3"]
[White "E"]
[Black "F"]
[Result "*"]

1. c4 *`;

      const games = service.parseMultipleGames(pgn);

      expect(games).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for empty PGN', () => {
      expect(() => service.parseSingleGame('')).toThrow(PgnParseError);
      expect(() => service.parseSingleGame('   ')).toThrow(PgnParseError);
    });

    it('should throw error for missing required headers', () => {
      const pgn = `[Event "Test"]
[Site "Online"]

1. e4 e5 *`;

      expect(() => service.parseSingleGame(pgn)).toThrow(PgnParseError);
      expect(() => service.parseSingleGame(pgn)).toThrow(/Missing required header/);
    });

    it('should throw error for invalid header format', () => {
      const pgn = `[Event Test Tournament]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 *`;

      expect(() => service.parseSingleGame(pgn)).toThrow(PgnParseError);
      expect(() => service.parseSingleGame(pgn)).toThrow(/Invalid header format/);
    });

    it('should throw error for invalid Result header', () => {
      const pgn = `[Event "Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "2-0"]

1. e4 *`;

      expect(() => service.parseSingleGame(pgn)).toThrow(PgnParseError);
      expect(() => service.parseSingleGame(pgn)).toThrow(/Invalid Result header/);
    });

    it('should throw error for unclosed comment brace', () => {
      const pgn = `[Event "Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 {This comment is not closed e5 *`;

      expect(() => service.parseSingleGame(pgn)).toThrow(PgnParseError);
      expect(() => service.parseSingleGame(pgn)).toThrow(/Unclosed comment brace/);
    });

    it('should throw error for unclosed variation parenthesis', () => {
      const pgn = `[Event "Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 e5 (1... c5 2. Nf3 *`;

      expect(() => service.parseSingleGame(pgn)).toThrow(PgnParseError);
      expect(() => service.parseSingleGame(pgn)).toThrow(/Unclosed variation parenthesis/);
    });

    it('should throw error for invalid move notation', () => {
      const pgn = `[Event "Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 e5 2. Xyz123 *`;

      expect(() => service.parseSingleGame(pgn)).toThrow(PgnParseError);
      expect(() => service.parseSingleGame(pgn)).toThrow(/Invalid move or token/);
    });

    it('should throw error for empty move text', () => {
      const pgn = `[Event "Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

`;

      expect(() => service.parseSingleGame(pgn)).toThrow(PgnParseError);
      expect(() => service.parseSingleGame(pgn)).toThrow(/Move text is empty/);
    });

    it('should provide descriptive error with line number', () => {
      const pgn = `[Event "Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "invalid"]

1. e4 *`;

      try {
        service.parseSingleGame(pgn);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(PgnParseError);
        expect(error.message).toContain('Invalid Result header');
      }
    });
  });

  describe('validateGame', () => {
    it('should validate a legal game', () => {
      const pgn = `[Event "Valid Game"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *`;

      const game = service.parseSingleGame(pgn);
      expect(() => service.validateGame(game)).not.toThrow();
    });

    it('should throw error for illegal move sequence', () => {
      const game = {
        headers: {
          Event: 'Test',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'A',
          Black: 'B',
          Result: '*',
        },
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Nxe4', 'Qxf2'], // Illegal - Queen can't take on f2
        comments: {},
        variations: {},
      };

      expect(() => service.validateGame(game)).toThrow(PgnParseError);
    });
  });

  describe('Real-world PGN Examples', () => {
    it('should parse Scholar\'s Mate', () => {
      const pgn = `[Event "Scholar's Mate"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Beginner"]
[Black "Victim"]
[Result "1-0"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0`;

      const game = service.parseSingleGame(pgn);
      expect(game.moves).toHaveLength(7);
      expect(service.validateGame(game)).toBe(true);
    });

    it('should parse Fool\'s Mate', () => {
      const pgn = `[Event "Fool's Mate"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Fool"]
[Black "Winner"]
[Result "0-1"]

1. f3 e5 2. g4 Qh4# 0-1`;

      const game = service.parseSingleGame(pgn);
      expect(game.moves).toHaveLength(4);
      expect(service.validateGame(game)).toBe(true);
    });

    it('should parse a game with annotations', () => {
      const pgn = `[Event "Annotated Game"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4! {Excellent opening move} e5 {Symmetrical} 2. Nf3 Nc6 3. Bb5 {The Ruy Lopez} a6 {Morphy Defense} *`;

      const game = service.parseSingleGame(pgn);
      expect(game.moves).toHaveLength(6);
      expect(Object.keys(game.comments).length).toBeGreaterThan(0);
    });
  });
});

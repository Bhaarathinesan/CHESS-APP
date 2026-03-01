import { Test, TestingModule } from '@nestjs/testing';
import { PgnFormatterService } from './pgn-formatter.service';
import { ParsedGame } from './pgn-parser.service';

describe('PgnFormatterService', () => {
  let service: PgnFormatterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PgnFormatterService],
    }).compile();

    service = module.get<PgnFormatterService>(PgnFormatterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('formatGame - Basic Formatting', () => {
    it('should format a simple game with all required headers', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Test Tournament',
          Site: 'Test City',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player One',
          Black: 'Player Two',
          Result: '1-0',
        },
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
        comments: {},
        variations: {},
        result: '1-0',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('[Event "Test Tournament"]');
      expect(pgn).toContain('[Site "Test City"]');
      expect(pgn).toContain('[Date "2024.01.15"]');
      expect(pgn).toContain('[Round "1"]');
      expect(pgn).toContain('[White "Player One"]');
      expect(pgn).toContain('[Black "Player Two"]');
      expect(pgn).toContain('[Result "1-0"]');
      expect(pgn).toContain('1. e4 e5 2. Nf3 Nc6 3. Bb5 1-0');
    });

    it('should format headers in correct order', () => {
      const game: ParsedGame = {
        headers: {
          Result: '1-0',
          Black: 'Player Two',
          White: 'Player One',
          Round: '1',
          Date: '2024.01.15',
          Site: 'Test City',
          Event: 'Test Tournament',
        },
        moves: ['e4'],
        comments: {},
        variations: {},
        result: '1-0',
      };

      const pgn = service.formatGame(game);
      const lines = pgn.split('\n');

      expect(lines[0]).toContain('[Event');
      expect(lines[1]).toContain('[Site');
      expect(lines[2]).toContain('[Date');
      expect(lines[3]).toContain('[Round');
      expect(lines[4]).toContain('[White');
      expect(lines[5]).toContain('[Black');
      expect(lines[6]).toContain('[Result');
    });

    it('should include optional headers after required headers', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Test',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
          ECO: 'C50',
          WhiteElo: '1500',
          BlackElo: '1480',
        },
        moves: ['e4'],
        comments: {},
        variations: {},
        result: '*',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('[ECO "C50"]');
      expect(pgn).toContain('[WhiteElo "1500"]');
      expect(pgn).toContain('[BlackElo "1480"]');
    });

    it('should format moves with proper move numbers', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Test',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
        },
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6'],
        comments: {},
        variations: {},
        result: '*',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6');
    });

    it('should format castling moves correctly', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Castling Test',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
        },
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6', 'd3', 'O-O'],
        comments: {},
        variations: {},
        result: '*',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('O-O');
      expect(pgn.match(/O-O/g)?.length).toBe(2);
    });

    it('should format queenside castling correctly', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Queenside Castling',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
        },
        moves: ['d4', 'd5', 'Nc3', 'Nc6', 'Bf4', 'Bf5', 'Qd2', 'Qd7', 'O-O-O', 'O-O-O'],
        comments: {},
        variations: {},
        result: '*',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('O-O-O');
    });

    it('should format pawn promotion correctly', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Promotion Test',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
        },
        moves: ['e4', 'd5', 'exd5', 'e6', 'dxe6', 'fxe6', 'a4', 'e5', 'a5', 'e4', 'a6', 'e3', 'axb7', 'exf2+', 'Kxf2', 'Qd6', 'bxa8=Q'],
        comments: {},
        variations: {},
        result: '*',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('bxa8=Q');
    });
  });

  describe('formatGame - Result Markers', () => {
    it('should format white win result', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'White Win',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '1-0',
        },
        moves: ['e4', 'e5', 'Nf3'],
        comments: {},
        variations: {},
        result: '1-0',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('1-0');
      expect(pgn.match(/1-0/g)?.length).toBe(2); // Once in header, once at end
    });

    it('should format black win result', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Black Win',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '0-1',
        },
        moves: ['e4', 'e5', 'Nf3'],
        comments: {},
        variations: {},
        result: '0-1',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('0-1');
    });

    it('should format draw result', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Draw',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '1/2-1/2',
        },
        moves: ['e4', 'e5', 'Nf3'],
        comments: {},
        variations: {},
        result: '1/2-1/2',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('1/2-1/2');
    });

    it('should format ongoing game result', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Ongoing',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
        },
        moves: ['e4', 'e5'],
        comments: {},
        variations: {},
        result: '*',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('*');
    });

    it('should use header result if result field is missing', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Test',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '1-0',
        },
        moves: ['e4', 'e5'],
        comments: {},
        variations: {},
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('1-0');
    });
  });

  describe('formatGame - Comments', () => {
    it('should format comments in braces', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Comment Test',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
        },
        moves: ['e4', 'e5', 'Nf3'],
        comments: {
          1: ['Best by test'],
          2: ['Classical response'],
          3: ['Developing'],
        },
        variations: {},
        result: '*',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('{Best by test}');
      expect(pgn).toContain('{Classical response}');
      expect(pgn).toContain('{Developing}');
    });

    it('should format multiple comments for the same move', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Multiple Comments',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
        },
        moves: ['e4', 'e5'],
        comments: {
          1: ['First comment', 'Second comment'],
        },
        variations: {},
        result: '*',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('{First comment}');
      expect(pgn).toContain('{Second comment}');
    });
  });

  describe('formatGame - Variations', () => {
    it('should format variations in parentheses', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Variation Test',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
        },
        moves: ['e4', 'e5', 'Nf3', 'Nc6'],
        comments: {},
        variations: {
          2: [['c5', 'Nf3']],
        },
        result: '*',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('(1... c5 2. Nf3)');
    });

    it('should format multiple variations', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Multiple Variations',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
        },
        moves: ['e4', 'e5', 'Nf3'],
        comments: {},
        variations: {
          2: [['c5'], ['e6']],
        },
        result: '*',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('(1... c5)');
      expect(pgn).toContain('(1... e6)');
    });

    it('should format variations starting with white move', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'White Variation',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
        },
        moves: ['e4', 'e5', 'Nf3'],
        comments: {},
        variations: {
          3: [['d4', 'exd4']],
        },
        result: '*',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('(2. d4 exd4)');
    });
  });

  describe('formatMultipleGames', () => {
    it('should format multiple games separated by blank lines', () => {
      const games: ParsedGame[] = [
        {
          headers: {
            Event: 'Game 1',
            Site: 'Online',
            Date: '2024.01.15',
            Round: '1',
            White: 'Player A',
            Black: 'Player B',
            Result: '1-0',
          },
          moves: ['e4', 'e5', 'Nf3'],
          comments: {},
          variations: {},
          result: '1-0',
        },
        {
          headers: {
            Event: 'Game 2',
            Site: 'Online',
            Date: '2024.01.15',
            Round: '2',
            White: 'Player C',
            Black: 'Player D',
            Result: '0-1',
          },
          moves: ['d4', 'd5', 'c4'],
          comments: {},
          variations: {},
          result: '0-1',
        },
      ];

      const pgn = service.formatMultipleGames(games);

      expect(pgn).toContain('[Event "Game 1"]');
      expect(pgn).toContain('[Event "Game 2"]');
      expect(pgn).toContain('1. e4 e5 2. Nf3 1-0');
      expect(pgn).toContain('1. d4 d5 2. c4 0-1');

      // Check that games are separated by blank lines
      const sections = pgn.split('\n\n');
      expect(sections.length).toBeGreaterThan(1);
    });

    it('should format three games', () => {
      const games: ParsedGame[] = [
        {
          headers: {
            Event: 'Game 1',
            Site: 'Online',
            Date: '2024.01.15',
            Round: '1',
            White: 'A',
            Black: 'B',
            Result: '*',
          },
          moves: ['e4'],
          comments: {},
          variations: {},
          result: '*',
        },
        {
          headers: {
            Event: 'Game 2',
            Site: 'Online',
            Date: '2024.01.15',
            Round: '2',
            White: 'C',
            Black: 'D',
            Result: '*',
          },
          moves: ['d4'],
          comments: {},
          variations: {},
          result: '*',
        },
        {
          headers: {
            Event: 'Game 3',
            Site: 'Online',
            Date: '2024.01.15',
            Round: '3',
            White: 'E',
            Black: 'F',
            Result: '*',
          },
          moves: ['c4'],
          comments: {},
          variations: {},
          result: '*',
        },
      ];

      const pgn = service.formatMultipleGames(games);

      expect(pgn).toContain('[Event "Game 1"]');
      expect(pgn).toContain('[Event "Game 2"]');
      expect(pgn).toContain('[Event "Game 3"]');
    });
  });

  describe('Line Wrapping', () => {
    it('should wrap long move sequences at reasonable line length', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Long Game',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
        },
        moves: [
          'e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7',
          'd4', 'exd4', 'Nxd4', 'Nxd4', 'Qxd4', 'O-O', 'Nc3', 'd6', 'Bf4', 'Bd7',
          'Rad1', 'Bc6', 'Bxc6', 'bxc6', 'Qd3', 'Qd7', 'Rfe1', 'Rfe8', 'h3', 'h6',
        ],
        comments: {},
        variations: {},
        result: '*',
      };

      const pgn = service.formatGame(game);
      const moveLines = pgn.split('\n').filter(line => !line.startsWith('[') && line.trim().length > 0);

      // Check that lines are wrapped (should have multiple lines for moves)
      expect(moveLines.length).toBeGreaterThan(1);

      // Check that no line exceeds 80 characters
      for (const line of moveLines) {
        expect(line.length).toBeLessThanOrEqual(80);
      }
    });
  });

  describe('Real-world Examples', () => {
    it('should format Scholar\'s Mate', () => {
      const game: ParsedGame = {
        headers: {
          Event: "Scholar's Mate",
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Beginner',
          Black: 'Victim',
          Result: '1-0',
        },
        moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'],
        comments: {},
        variations: {},
        result: '1-0',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('[Event "Scholar\'s Mate"]');
      expect(pgn).toContain('1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0');
    });

    it('should format Fool\'s Mate', () => {
      const game: ParsedGame = {
        headers: {
          Event: "Fool's Mate",
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Fool',
          Black: 'Winner',
          Result: '0-1',
        },
        moves: ['f3', 'e5', 'g4', 'Qh4#'],
        comments: {},
        variations: {},
        result: '0-1',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('1. f3 e5 2. g4 Qh4# 0-1');
    });

    it('should format an annotated game', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'Annotated Game',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
        },
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'],
        comments: {
          1: ['Excellent opening move'],
          2: ['Symmetrical'],
          5: ['The Ruy Lopez'],
          6: ['Morphy Defense'],
        },
        variations: {},
        result: '*',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('{Excellent opening move}');
      expect(pgn).toContain('{Symmetrical}');
      expect(pgn).toContain('{The Ruy Lopez}');
      expect(pgn).toContain('{Morphy Defense}');
    });
  });

  describe('Edge Cases', () => {
    it('should handle game with only one move', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'One Move',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
        },
        moves: ['e4'],
        comments: {},
        variations: {},
        result: '*',
      };

      const pgn = service.formatGame(game);

      expect(pgn).toContain('1. e4 *');
    });

    it('should handle game with empty comments object', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'No Comments',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
        },
        moves: ['e4', 'e5'],
        comments: {},
        variations: {},
        result: '*',
      };

      const pgn = service.formatGame(game);

      expect(pgn).not.toContain('{');
      expect(pgn).not.toContain('}');
    });

    it('should handle game with empty variations object', () => {
      const game: ParsedGame = {
        headers: {
          Event: 'No Variations',
          Site: 'Online',
          Date: '2024.01.15',
          Round: '1',
          White: 'Player A',
          Black: 'Player B',
          Result: '*',
        },
        moves: ['e4', 'e5'],
        comments: {},
        variations: {},
        result: '*',
      };

      const pgn = service.formatGame(game);

      expect(pgn).not.toContain('(');
      expect(pgn).not.toContain(')');
    });
  });
});

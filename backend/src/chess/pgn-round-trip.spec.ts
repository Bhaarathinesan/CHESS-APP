import { Test, TestingModule } from '@nestjs/testing';
import { PgnParserService } from './pgn-parser.service';
import { PgnFormatterService } from './pgn-formatter.service';

describe('PGN Round-Trip Tests', () => {
  let parserService: PgnParserService;
  let formatterService: PgnFormatterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PgnParserService, PgnFormatterService],
    }).compile();

    parserService = module.get<PgnParserService>(PgnParserService);
    formatterService = module.get<PgnFormatterService>(PgnFormatterService);
  });

  describe('Parse → Format → Parse Round-Trip', () => {
    it('should preserve game data through parse-format-parse cycle', () => {
      const originalPgn = `[Event "Test Tournament"]
[Site "Test City"]
[Date "2024.01.15"]
[Round "1"]
[White "Player One"]
[Black "Player Two"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0`;

      // Parse the original PGN
      const game1 = parserService.parseSingleGame(originalPgn);

      // Format it back to PGN
      const formattedPgn = formatterService.formatGame(game1);

      // Parse the formatted PGN
      const game2 = parserService.parseSingleGame(formattedPgn);

      // Verify that the game data is preserved
      expect(game2.headers).toEqual(game1.headers);
      expect(game2.moves).toEqual(game1.moves);
      expect(game2.result).toEqual(game1.result);
    });

    it('should preserve comments through round-trip', () => {
      const originalPgn = `[Event "Commented Game"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 {Best move} e5 {Classical} 2. Nf3 {Developing} *`;

      const game1 = parserService.parseSingleGame(originalPgn);
      const formattedPgn = formatterService.formatGame(game1);
      const game2 = parserService.parseSingleGame(formattedPgn);

      expect(game2.comments).toEqual(game1.comments);
      expect(game2.moves).toEqual(game1.moves);
    });

    it('should preserve variations through round-trip', () => {
      const originalPgn = `[Event "Variation Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 e5 (1... c5 2. Nf3) 2. Nf3 Nc6 *`;

      const game1 = parserService.parseSingleGame(originalPgn);
      const formattedPgn = formatterService.formatGame(game1);
      const game2 = parserService.parseSingleGame(formattedPgn);

      expect(game2.variations).toEqual(game1.variations);
      expect(game2.moves).toEqual(game1.moves);
    });

    it('should preserve optional headers through round-trip', () => {
      const originalPgn = `[Event "Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]
[ECO "C50"]
[WhiteElo "1500"]
[BlackElo "1480"]

1. e4 e5 *`;

      const game1 = parserService.parseSingleGame(originalPgn);
      const formattedPgn = formatterService.formatGame(game1);
      const game2 = parserService.parseSingleGame(formattedPgn);

      expect(game2.headers['ECO']).toBe('C50');
      expect(game2.headers['WhiteElo']).toBe('1500');
      expect(game2.headers['BlackElo']).toBe('1480');
    });

    it('should handle Scholar\'s Mate round-trip', () => {
      const originalPgn = `[Event "Scholar's Mate"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Beginner"]
[Black "Victim"]
[Result "1-0"]

1. e4 e5 2. Bc4 Nc6 3. Qh5 Nf6 4. Qxf7# 1-0`;

      const game1 = parserService.parseSingleGame(originalPgn);
      const formattedPgn = formatterService.formatGame(game1);
      const game2 = parserService.parseSingleGame(formattedPgn);

      expect(game2.moves).toEqual(game1.moves);
      expect(game2.result).toBe('1-0');
      expect(parserService.validateGame(game2)).toBe(true);
    });

    it('should handle castling through round-trip', () => {
      const originalPgn = `[Event "Castling Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. d3 O-O *`;

      const game1 = parserService.parseSingleGame(originalPgn);
      const formattedPgn = formatterService.formatGame(game1);
      const game2 = parserService.parseSingleGame(formattedPgn);

      expect(game2.moves).toEqual(game1.moves);
      expect(game2.moves).toContain('O-O');
      expect(parserService.validateGame(game2)).toBe(true);
    });

    it('should handle queenside castling through round-trip', () => {
      const originalPgn = `[Event "Queenside Castling"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. d4 d5 2. Nc3 Nc6 3. Bf4 Bf5 4. Qd2 Qd7 5. O-O-O O-O-O *`;

      const game1 = parserService.parseSingleGame(originalPgn);
      const formattedPgn = formatterService.formatGame(game1);
      const game2 = parserService.parseSingleGame(formattedPgn);

      expect(game2.moves).toEqual(game1.moves);
      expect(game2.moves).toContain('O-O-O');
      expect(parserService.validateGame(game2)).toBe(true);
    });

    it('should handle pawn promotion through round-trip', () => {
      const originalPgn = `[Event "Promotion Test"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 d5 2. exd5 e6 3. dxe6 fxe6 4. a4 e5 5. a5 e4 6. a6 e3 7. axb7 exf2+ 8. Kxf2 Qd6 9. bxa8=Q *`;

      const game1 = parserService.parseSingleGame(originalPgn);
      const formattedPgn = formatterService.formatGame(game1);
      const game2 = parserService.parseSingleGame(formattedPgn);

      expect(game2.moves).toEqual(game1.moves);
      expect(game2.moves).toContain('bxa8=Q');
      expect(parserService.validateGame(game2)).toBe(true);
    });

    it('should handle multiple games round-trip', () => {
      const originalPgn = `[Event "Game 1"]
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

      const games1 = parserService.parseMultipleGames(originalPgn);
      const formattedPgn = formatterService.formatMultipleGames(games1);
      const games2 = parserService.parseMultipleGames(formattedPgn);

      expect(games2.length).toBe(games1.length);
      expect(games2[0].headers['Event']).toBe(games1[0].headers['Event']);
      expect(games2[1].headers['Event']).toBe(games1[1].headers['Event']);
      expect(games2[0].moves).toEqual(games1[0].moves);
      expect(games2[1].moves).toEqual(games1[1].moves);
    });

    it('should handle complex game with comments and variations', () => {
      const originalPgn = `[Event "Complex Game"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 {King's pawn opening} e5 {Symmetrical response} (1... c5 {Sicilian Defense} 2. Nf3) 2. Nf3 Nc6 3. Bb5 {Ruy Lopez} a6 *`;

      const game1 = parserService.parseSingleGame(originalPgn);
      const formattedPgn = formatterService.formatGame(game1);
      const game2 = parserService.parseSingleGame(formattedPgn);

      expect(game2.moves).toEqual(game1.moves);
      expect(game2.comments[1]).toEqual(game1.comments[1]);
      expect(game2.comments[2]).toEqual(game1.comments[2]);
      expect(game2.variations[2]).toEqual(game1.variations[2]);
    });
  });

  describe('Format → Parse Validation', () => {
    it('should produce valid PGN that can be validated', () => {
      const originalPgn = `[Event "Valid Game"]
[Site "Online"]
[Date "2024.01.15"]
[Round "1"]
[White "Player A"]
[Black "Player B"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 *`;

      const game = parserService.parseSingleGame(originalPgn);
      const formattedPgn = formatterService.formatGame(game);
      const reparsedGame = parserService.parseSingleGame(formattedPgn);

      // Should be able to validate the reparsed game
      expect(() => parserService.validateGame(reparsedGame)).not.toThrow();
      expect(parserService.validateGame(reparsedGame)).toBe(true);
    });
  });
});

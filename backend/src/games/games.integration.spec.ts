import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { GamesModule } from './games.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { JwtService } from '@nestjs/jwt';

/**
 * Integration tests for PGN import/export endpoints
 * Tests requirements 28.11, 28.12, 28.13
 */
describe('Games API Integration Tests', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [GamesModule, AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create a test user
    const user = await prismaService.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        passwordHash: 'hashed_password',
        collegeName: 'Test College',
        collegeDomain: 'example.com',
        role: 'PLAYER',
      },
    });

    userId = user.id;

    // Generate auth token
    authToken = jwtService.sign({ userId: user.id, email: user.email });
  });

  afterAll(async () => {
    // Clean up test data
    await prismaService.gameMove.deleteMany({});
    await prismaService.game.deleteMany({});
    await prismaService.user.deleteMany({});
    await app.close();
  });

  describe('POST /games/import-pgn (Requirement 28.11)', () => {
    it('should successfully import a valid PGN file', async () => {
      const pgnText = `[Event "Test Tournament"]
[Site "ChessArena"]
[Date "2024.01.15"]
[Round "1"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 1-0`;

      const response = await request(app.getHttpServer())
        .post('/games/import-pgn')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pgnText })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Successfully imported');
      expect(response.body).toHaveProperty('gameIds');
      expect(response.body.gameIds).toHaveLength(1);
      expect(response.body.count).toBe(1);
    });

    it('should import multiple games from a single PGN file', async () => {
      const pgnText = `[Event "Game 1"]
[Site "ChessArena"]
[Date "2024.01.15"]
[Round "1"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 1-0

[Event "Game 2"]
[Site "ChessArena"]
[Date "2024.01.16"]
[Round "2"]
[White "Player3"]
[Black "Player4"]
[Result "0-1"]

1. d4 d5 0-1`;

      const response = await request(app.getHttpServer())
        .post('/games/import-pgn')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pgnText })
        .expect(201);

      expect(response.body.count).toBe(2);
      expect(response.body.gameIds).toHaveLength(2);
    });

    it('should reject invalid PGN with descriptive error', async () => {
      const invalidPgn = 'This is not a valid PGN file';

      const response = await request(app.getHttpServer())
        .post('/games/import-pgn')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pgnText: invalidPgn })
        .expect(400);

      expect(response.body.message).toContain('PGN parsing failed');
    });

    it('should require authentication', async () => {
      const pgnText = '[Event "Test"]\n\n1. e4 e5';

      await request(app.getHttpServer())
        .post('/games/import-pgn')
        .send({ pgnText })
        .expect(401);
    });

    it('should validate request body', async () => {
      await request(app.getHttpServer())
        .post('/games/import-pgn')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /games/:id/pgn (Requirement 28.12)', () => {
    let gameId: string;

    beforeEach(async () => {
      // Create a test game
      const game = await prismaService.game.create({
        data: {
          whitePlayerId: userId,
          blackPlayerId: userId,
          timeControl: 'BLITZ',
          initialTimeMinutes: 5,
          incrementSeconds: 3,
          isRated: false,
          status: 'COMPLETED',
          result: 'WHITE_WIN',
          pgn: `[Event "Test Game"]
[Site "ChessArena"]
[Date "2024.01.15"]
[Round "1"]
[White "Test User"]
[Black "Test User"]
[Result "1-0"]

1. e4 e5 1-0`,
          moveCount: 2,
        },
      });

      gameId = game.id;
    });

    it('should download a game as PGN', async () => {
      const response = await request(app.getHttpServer())
        .get(`/games/${gameId}/pgn`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.text).toContain('[Event "Test Game"]');
      expect(response.text).toContain('1. e4 e5');
      expect(response.headers['content-type']).toContain(
        'application/x-chess-pgn',
      );
      expect(response.headers['content-disposition']).toContain(
        'attachment; filename="game.pgn"',
      );
    });

    it('should return 404 for non-existent game', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/games/${fakeId}/pgn`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/games/${gameId}/pgn`)
        .expect(401);
    });
  });

  describe('POST /games/export-pgn (Requirement 28.13)', () => {
    let gameIds: string[];

    beforeEach(async () => {
      // Create multiple test games
      const game1 = await prismaService.game.create({
        data: {
          whitePlayerId: userId,
          blackPlayerId: userId,
          timeControl: 'BLITZ',
          initialTimeMinutes: 5,
          incrementSeconds: 3,
          isRated: false,
          status: 'COMPLETED',
          result: 'WHITE_WIN',
          moveCount: 2,
        },
      });

      const game2 = await prismaService.game.create({
        data: {
          whitePlayerId: userId,
          blackPlayerId: userId,
          timeControl: 'RAPID',
          initialTimeMinutes: 10,
          incrementSeconds: 0,
          isRated: false,
          status: 'COMPLETED',
          result: 'DRAW',
          moveCount: 4,
        },
      });

      gameIds = [game1.id, game2.id];
    });

    it('should download multiple games as a single PGN file', async () => {
      const response = await request(app.getHttpServer())
        .post('/games/export-pgn')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ gameIds })
        .expect(200);

      expect(response.text).toContain('[Event ');
      expect(response.headers['content-type']).toContain(
        'application/x-chess-pgn',
      );
      expect(response.headers['content-disposition']).toContain(
        'attachment; filename="games.pgn"',
      );
    });

    it('should handle GET request with query parameters', async () => {
      const gameIdsQuery = gameIds.join(',');

      const response = await request(app.getHttpServer())
        .get(`/games/export-pgn?gameIds=${gameIdsQuery}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.text).toContain('[Event ');
    });

    it('should return 400 for empty game IDs array', async () => {
      await request(app.getHttpServer())
        .post('/games/export-pgn')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ gameIds: [] })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/games/export-pgn')
        .send({ gameIds })
        .expect(401);
    });

    it('should validate UUID format', async () => {
      await request(app.getHttpServer())
        .post('/games/export-pgn')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ gameIds: ['invalid-uuid', 'another-invalid'] })
        .expect(400);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ReportsModule } from './reports.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { JwtService } from '@nestjs/jwt';

describe('ReportsController (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let authToken: string;
  let adminToken: string;
  let userId: string;
  let reportedUserId: string;
  let gameId: string;
  let chatMessageId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ReportsModule, PrismaModule, AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    // Create test users
    const user = await prisma.user.create({
      data: {
        email: 'reporter@test.com',
        username: 'reporter',
        displayName: 'Reporter User',
        collegeName: 'Test College',
        collegeDomain: 'test.edu',
        role: 'PLAYER',
      },
    });
    userId = user.id;

    const reportedUser = await prisma.user.create({
      data: {
        email: 'reported@test.com',
        username: 'reported',
        displayName: 'Reported User',
        collegeName: 'Test College',
        collegeDomain: 'test.edu',
        role: 'PLAYER',
      },
    });
    reportedUserId = reportedUser.id;

    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        username: 'admin',
        displayName: 'Admin User',
        collegeName: 'Test College',
        collegeDomain: 'test.edu',
        role: 'SUPER_ADMIN',
      },
    });

    // Create test game
    const game = await prisma.game.create({
      data: {
        whitePlayerId: userId,
        blackPlayerId: reportedUserId,
        timeControl: 'BLITZ',
        initialTimeMinutes: 5,
        incrementSeconds: 0,
        status: 'COMPLETED',
      },
    });
    gameId = game.id;

    // Create test chat message
    const chatMessage = await prisma.chatMessage.create({
      data: {
        gameId: gameId,
        senderId: reportedUserId,
        message: 'Test message',
      },
    });
    chatMessageId = chatMessage.id;

    // Generate tokens
    authToken = jwtService.sign({ sub: userId, username: 'reporter' });
    adminToken = jwtService.sign({ sub: admin.id, username: 'admin' });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.report.deleteMany({});
    await prisma.chatMessage.deleteMany({});
    await prisma.game.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        email: { in: ['reporter@test.com', 'reported@test.com', 'admin@test.com'] },
      },
    });

    await app.close();
  });

  describe('POST /reports', () => {
    it('should create a user report', async () => {
      const response = await request(app.getHttpServer())
        .post('/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'user',
          description: 'Harassment in chat',
          reportedUserId: reportedUserId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.reportType).toBe('harassment');
      expect(response.body.status).toBe('PENDING');
      expect(response.body.reportedUserId).toBe(reportedUserId);
    });

    it('should create a game report', async () => {
      const response = await request(app.getHttpServer())
        .post('/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'game',
          description: 'Suspected cheating',
          reportedUserId: reportedUserId,
          gameId: gameId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.reportType).toBe('cheating');
      expect(response.body.gameId).toBe(gameId);
    });

    it('should create a chat report', async () => {
      const response = await request(app.getHttpServer())
        .post('/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'chat',
          description: 'Inappropriate language',
          chatMessageId: chatMessageId,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.reportType).toBe('inappropriate_chat');
    });

    it('should reject report without authentication', async () => {
      await request(app.getHttpServer())
        .post('/reports')
        .send({
          reportType: 'user',
          description: 'Test',
          reportedUserId: reportedUserId,
        })
        .expect(401);
    });

    it('should reject invalid report type', async () => {
      await request(app.getHttpServer())
        .post('/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'invalid',
          description: 'Test',
        })
        .expect(400);
    });
  });

  describe('GET /reports', () => {
    it('should return reports for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter reports by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/reports?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((report: any) => {
        expect(report.status).toBe('PENDING');
      });
    });

    it('should reject non-admin access', async () => {
      await request(app.getHttpServer())
        .get('/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });
  });

  describe('PATCH /reports/:id/status', () => {
    it('should update report status', async () => {
      // First create a report
      const createResponse = await request(app.getHttpServer())
        .post('/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'user',
          description: 'Test report for status update',
          reportedUserId: reportedUserId,
        });

      const reportId = createResponse.body.id;

      // Update status
      const response = await request(app.getHttpServer())
        .patch(`/reports/${reportId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'reviewed',
          adminNotes: 'Reviewed and resolved',
        })
        .expect(200);

      expect(response.body.status).toBe('REVIEWED');
      expect(response.body.adminNotes).toBe('Reviewed and resolved');
      expect(response.body.reviewedBy).toBeDefined();
      expect(response.body.reviewedAt).toBeDefined();
    });

    it('should reject non-admin status update', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reportType: 'user',
          description: 'Test report',
          reportedUserId: reportedUserId,
        });

      const reportId = createResponse.body.id;

      await request(app.getHttpServer())
        .patch(`/reports/${reportId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'reviewed',
        })
        .expect(403);
    });
  });
});

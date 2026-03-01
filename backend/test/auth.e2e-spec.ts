import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    prismaService = app.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    if (process.env.NODE_ENV !== 'production') {
      await prismaService.user.deleteMany({
        where: {
          email: {
            contains: 'test',
          },
        },
      });
    }
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', () => {
      const registerDto = {
        email: 'testuser@university.edu',
        username: 'testuser123',
        password: 'Password123',
        displayName: 'Test User',
        collegeName: 'Test University',
        collegeDomain: 'university.edu',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.message).toBe('User registered successfully');
          expect(res.body.user).toBeDefined();
          expect(res.body.user.email).toBe(registerDto.email);
          expect(res.body.user.username).toBe(registerDto.username);
          expect(res.body.user.displayName).toBe(registerDto.displayName);
          expect(res.body.user.passwordHash).toBeUndefined();
        });
    });

    it('should return 400 for invalid email format', () => {
      const registerDto = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'Password123',
        displayName: 'Test User',
        collegeName: 'Test University',
        collegeDomain: 'university.edu',
      };

      return request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(400);
    });

    it('should return 400 for weak password', () => {
      const registerDto = {
        email: 'testuser@university.edu',
        username: 'testuser',
        password: 'weak',
        displayName: 'Test User',
        collegeName: 'Test University',
        collegeDomain: 'university.edu',
      };

      return request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(400);
    });

    it('should return 409 for duplicate email', async () => {
      const registerDto = {
        email: 'duplicate@university.edu',
        username: 'user1',
        password: 'Password123',
        displayName: 'User One',
        collegeName: 'Test University',
        collegeDomain: 'university.edu',
      };

      // Register first user
      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(201);

      // Try to register with same email
      const duplicateDto = {
        ...registerDto,
        username: 'user2',
      };

      return request(app.getHttpServer()).post('/auth/register').send(duplicateDto).expect(409);
    });

    it('should return 409 for duplicate username', async () => {
      const registerDto = {
        email: 'user1@university.edu',
        username: 'duplicateuser',
        password: 'Password123',
        displayName: 'User One',
        collegeName: 'Test University',
        collegeDomain: 'university.edu',
      };

      // Register first user
      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(201);

      // Try to register with same username
      const duplicateDto = {
        ...registerDto,
        email: 'user2@university.edu',
      };

      return request(app.getHttpServer()).post('/auth/register').send(duplicateDto).expect(409);
    });

    it('should return 400 for non-educational email domain', () => {
      const registerDto = {
        email: 'user@company.com',
        username: 'testuser',
        password: 'Password123',
        displayName: 'Test User',
        collegeName: 'Test Company',
        collegeDomain: 'company.com',
      };

      return request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(400);
    });

    it('should return 400 when email domain does not match college domain', () => {
      const registerDto = {
        email: 'user@university.edu',
        username: 'testuser',
        password: 'Password123',
        displayName: 'Test User',
        collegeName: 'Different University',
        collegeDomain: 'different.edu',
      };

      return request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(400);
    });
  });
});

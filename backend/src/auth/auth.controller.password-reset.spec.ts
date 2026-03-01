import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController - Password Reset (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;

  const mockAuthService = {
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/forgot-password', () => {
    it('should send password reset email for valid email', async () => {
      const email = 'test@university.edu';
      mockAuthService.forgotPassword.mockResolvedValue({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'If an account with that email exists, a password reset link has been sent',
      );
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith({ email });
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Invalid email address');
      expect(mockAuthService.forgotPassword).not.toHaveBeenCalled();
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({})
        .expect(400);

      expect(mockAuthService.forgotPassword).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token and password', async () => {
      const token = 'valid-reset-token';
      const newPassword = 'NewPassword123';

      mockAuthService.resetPassword.mockResolvedValue({
        success: true,
        message: 'Password reset successfully',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token, newPassword })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset successfully');
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith({ token, newPassword });
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ newPassword: 'NewPassword123' })
        .expect(400);

      expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'valid-token' })
        .expect(400);

      expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
    });

    it('should return 400 for password too short', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'valid-token', newPassword: 'Short1' })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Password must be at least 8 characters');
      expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
    });

    it('should return 400 for password without uppercase letter', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'valid-token', newPassword: 'password123' })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Password must contain at least one uppercase letter');
      expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
    });

    it('should return 400 for password without lowercase letter', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'valid-token', newPassword: 'PASSWORD123' })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Password must contain at least one lowercase letter');
      expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
    });

    it('should return 400 for password without number', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'valid-token', newPassword: 'PasswordABC' })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Password must contain at least one number');
      expect(mockAuthService.resetPassword).not.toHaveBeenCalled();
    });
  });
});

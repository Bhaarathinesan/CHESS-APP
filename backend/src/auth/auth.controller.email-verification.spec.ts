import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController - Email Verification Endpoints', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    verifyEmail: jest.fn(),
    resendVerificationEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('GET /auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      const token = 'valid-token-123';
      const mockResult = {
        success: true,
        message: 'Email verified successfully',
      };

      mockAuthService.verifyEmail.mockResolvedValue(mockResult);

      const result = await controller.verifyEmail(token);

      expect(result).toEqual({
        success: true,
        message: 'Email verified successfully',
      });
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(token);
    });

    it('should handle already verified email', async () => {
      const token = 'valid-token-123';
      const mockResult = {
        success: true,
        message: 'Email already verified',
      };

      mockAuthService.verifyEmail.mockResolvedValue(mockResult);

      const result = await controller.verifyEmail(token);

      expect(result).toEqual({
        success: true,
        message: 'Email already verified',
      });
    });
  });

  describe('POST /auth/resend-verification', () => {
    it('should resend verification email', async () => {
      const email = 'test@university.edu';
      const mockResult = {
        success: true,
        message: 'Verification email sent',
      };

      mockAuthService.resendVerificationEmail.mockResolvedValue(mockResult);

      const result = await controller.resendVerification(email);

      expect(result).toEqual({
        success: true,
        message: 'Verification email sent',
      });
      expect(mockAuthService.resendVerificationEmail).toHaveBeenCalledWith(email);
    });
  });
});

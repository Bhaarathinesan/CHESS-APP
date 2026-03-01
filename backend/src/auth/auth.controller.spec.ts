import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
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

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and return success response', async () => {
      const registerDto = {
        email: 'student@university.edu',
        username: 'testuser',
        password: 'Password123',
        displayName: 'Test User',
        collegeName: 'Test University',
        collegeDomain: 'university.edu',
      };

      const mockUser = {
        id: 'user-id',
        email: registerDto.email,
        username: registerDto.username,
        displayName: registerDto.displayName,
        collegeName: registerDto.collegeName,
        collegeDomain: registerDto.collegeDomain,
        role: 'PLAYER',
        emailVerified: false,
      };

      mockAuthService.register.mockResolvedValue(mockUser);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual({
        success: true,
        message: 'User registered successfully',
        user: mockUser,
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'database.url') {
        return 'postgresql://test:test@localhost:5432/test';
      }
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have database models', () => {
    expect(service.user).toBeDefined();
    expect(service.game).toBeDefined();
    expect(service.tournament).toBeDefined();
    expect(service.rating).toBeDefined();
  });
});

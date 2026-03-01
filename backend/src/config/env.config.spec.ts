import { validateEnv } from './env.config';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('validateEnv', () => {
    it('should validate valid environment variables', () => {
      process.env = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'a'.repeat(32), // 32 characters minimum
        JWT_EXPIRATION: '24h',
        REFRESH_TOKEN_EXPIRATION: '30d',
        NODE_ENV: 'development',
        PORT: '3001',
        FRONTEND_URL: 'http://localhost:3000',
        CORS_ORIGIN: 'http://localhost:3000',
        RATE_LIMIT_TTL: '60',
        RATE_LIMIT_MAX: '100',
        WS_PORT: '3001',
        WS_PATH: '/socket.io',
        APPROVED_DOMAINS: 'edu,ac.uk',
      };

      expect(() => validateEnv()).not.toThrow();
    });

    it('should throw error for missing DATABASE_URL', () => {
      process.env = {
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'http://localhost:3000',
      };

      expect(() => validateEnv()).toThrow(/DATABASE_URL/);
    });

    it('should throw error for invalid DATABASE_URL format', () => {
      process.env = {
        DATABASE_URL: 'not-a-valid-url',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'http://localhost:3000',
      };

      expect(() => validateEnv()).toThrow(/DATABASE_URL/);
    });

    it('should throw error for JWT_SECRET shorter than 32 characters', () => {
      process.env = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'short', // Too short
        FRONTEND_URL: 'http://localhost:3000',
      };

      expect(() => validateEnv()).toThrow(/JWT_SECRET/);
    });

    it('should throw error for invalid NODE_ENV', () => {
      process.env = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'http://localhost:3000',
        NODE_ENV: 'invalid',
      };

      expect(() => validateEnv()).toThrow(/NODE_ENV/);
    });

    it('should use default values for optional variables', () => {
      process.env = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'http://localhost:3000',
      };

      const config = validateEnv();

      expect(config.JWT_EXPIRATION).toBe('24h');
      expect(config.REFRESH_TOKEN_EXPIRATION).toBe('30d');
      expect(config.NODE_ENV).toBe('development');
      expect(config.WS_PATH).toBe('/socket.io');
    });

    it('should parse PORT as number', () => {
      process.env = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'http://localhost:3000',
        PORT: '4000',
      };

      const config = validateEnv();

      expect(config.PORT).toBe(4000);
      expect(typeof config.PORT).toBe('number');
    });

    it('should parse APPROVED_DOMAINS as array', () => {
      process.env = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'http://localhost:3000',
        APPROVED_DOMAINS: 'edu, ac.uk, edu.au',
      };

      const config = validateEnv();

      expect(Array.isArray(config.APPROVED_DOMAINS)).toBe(true);
      expect(config.APPROVED_DOMAINS).toEqual(['edu', 'ac.uk', 'edu.au']);
    });

    it('should validate optional OAuth variables', () => {
      process.env = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'http://localhost:3000',
        GOOGLE_CLIENT_ID: 'test-client-id',
        GOOGLE_CLIENT_SECRET: 'test-client-secret',
        GOOGLE_CALLBACK_URL: 'http://localhost:3001/auth/google/callback',
      };

      const config = validateEnv();

      expect(config.GOOGLE_CLIENT_ID).toBe('test-client-id');
      expect(config.GOOGLE_CLIENT_SECRET).toBe('test-client-secret');
      expect(config.GOOGLE_CALLBACK_URL).toBe('http://localhost:3001/auth/google/callback');
    });

    it('should validate email format for FROM_EMAIL', () => {
      process.env = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'a'.repeat(32),
        FRONTEND_URL: 'http://localhost:3000',
        FROM_EMAIL: 'invalid-email',
      };

      expect(() => validateEnv()).toThrow(/FROM_EMAIL/);
    });
  });
});

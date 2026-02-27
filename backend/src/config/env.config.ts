import { z } from 'zod';

/**
 * Environment variable validation schema using Zod
 * This ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  // Database Configuration
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  REDIS_URL: z.string().url('REDIS_URL must be a valid URL'),

  // Authentication
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security'),
  JWT_EXPIRATION: z.string().default('24h'),
  REFRESH_TOKEN_EXPIRATION: z.string().default('30d'),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  // Email Service
  SENDGRID_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email('FROM_EMAIL must be a valid email').optional(),

  // Cloud Storage
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // Application Configuration
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .default('3001')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),

  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_TTL: z
    .string()
    .default('60')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  RATE_LIMIT_MAX: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),

  // WebSocket Configuration
  WS_PORT: z
    .string()
    .default('3001')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  WS_PATH: z.string().default('/socket.io'),

  // Logging
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug'])
    .default('info')
    .optional(),

  // Approved College Domains
  APPROVED_DOMAINS: z
    .string()
    .default('edu,ac.uk,edu.au')
    .transform((val) => val.split(',').map((d) => d.trim())),

  // Security (Production)
  ENABLE_HTTPS: z
    .string()
    .default('false')
    .transform((val) => val === 'true')
    .optional(),
  ENABLE_HELMET: z
    .string()
    .default('true')
    .transform((val) => val === 'true')
    .optional(),
});

/**
 * Validated environment variables type
 */
export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 * Throws an error if validation fails
 */
export function validateEnv(): EnvConfig {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(
        `Environment variable validation failed:\n${errorMessages}`,
      );
    }
    throw error;
  }
}

/**
 * Get validated environment configuration
 * Call this once at application startup
 */
let cachedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (!cachedEnv) {
    cachedEnv = validateEnv();
  }
  return cachedEnv;
}

// Export for convenience, but may throw if called before env is set
export const env = new Proxy({} as EnvConfig, {
  get: (target, prop) => {
    return getEnv()[prop as keyof EnvConfig];
  },
});

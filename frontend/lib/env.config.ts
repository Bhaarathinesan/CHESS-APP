import { z } from 'zod';

/**
 * Client-side environment variable validation schema
 * Only NEXT_PUBLIC_ variables are available on the client
 */
const clientEnvSchema = z.object({
  // API Configuration
  NEXT_PUBLIC_API_URL: z.string().url('NEXT_PUBLIC_API_URL must be a valid URL'),
  NEXT_PUBLIC_WS_URL: z.string().url('NEXT_PUBLIC_WS_URL must be a valid URL'),

  // OAuth
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),

  // Application Configuration
  NEXT_PUBLIC_APP_NAME: z.string().default('ChessArena'),
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),

  // Feature Flags
  NEXT_PUBLIC_ENABLE_ANALYTICS: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  NEXT_PUBLIC_ENABLE_PWA: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  NEXT_PUBLIC_ENABLE_DEBUG: z
    .string()
    .transform((val) => val === 'true')
    .default('false')
    .optional(),

  // Cloudinary
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: z.string().optional(),
});

/**
 * Server-side environment variable validation schema
 * Includes both public and private variables
 */
const serverEnvSchema = clientEnvSchema.extend({
  // Authentication (server-only)
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET must be at least 32 characters for security'),

  // Application Configuration (server-only)
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
});

/**
 * Validated client environment variables type
 */
export type ClientEnvConfig = z.infer<typeof clientEnvSchema>;

/**
 * Validated server environment variables type
 */
export type ServerEnvConfig = z.infer<typeof serverEnvSchema>;

/**
 * Validate client-side environment variables
 * Safe to use in browser
 */
export function validateClientEnv(): ClientEnvConfig {
  try {
    // Filter only NEXT_PUBLIC_ variables for client
    const clientEnv = Object.keys(process.env)
      .filter((key) => key.startsWith('NEXT_PUBLIC_'))
      .reduce((acc, key) => {
        acc[key] = process.env[key];
        return acc;
      }, {} as Record<string, string | undefined>);

    const parsed = clientEnvSchema.parse(clientEnv);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(
        `Client environment variable validation failed:\n${errorMessages}`,
      );
    }
    throw error;
  }
}

/**
 * Validate server-side environment variables
 * Only use on server (API routes, getServerSideProps, etc.)
 */
export function validateServerEnv(): ServerEnvConfig {
  try {
    const parsed = serverEnvSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(
        `Server environment variable validation failed:\n${errorMessages}`,
      );
    }
    throw error;
  }
}

/**
 * Get validated client environment configuration
 * Safe to use in browser
 */
let cachedClientEnv: ClientEnvConfig | null = null;

export function getClientEnv(): ClientEnvConfig {
  if (!cachedClientEnv) {
    cachedClientEnv = validateClientEnv();
  }
  return cachedClientEnv;
}

export const clientEnv = new Proxy({} as ClientEnvConfig, {
  get: (target, prop) => {
    return getClientEnv()[prop as keyof ClientEnvConfig];
  },
});

/**
 * Get validated server environment configuration
 * Only use on server
 */
let cachedServerEnv: ServerEnvConfig | null = null;

export const getServerEnv = () => {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() can only be called on the server');
  }
  if (!cachedServerEnv) {
    cachedServerEnv = validateServerEnv();
  }
  return cachedServerEnv;
};

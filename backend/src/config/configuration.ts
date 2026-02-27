import { getEnv } from './env.config';

/**
 * Application configuration factory
 * Returns a structured configuration object based on validated environment variables
 */
export default () => {
  const env = getEnv();

  return {
    // Database configuration
    database: {
      url: env.DATABASE_URL,
    },

    // Redis configuration
    redis: {
      url: env.REDIS_URL,
    },

    // Authentication configuration
    auth: {
      jwt: {
        secret: env.JWT_SECRET,
        expiresIn: env.JWT_EXPIRATION,
        refreshExpiresIn: env.REFRESH_TOKEN_EXPIRATION,
      },
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackUrl: env.GOOGLE_CALLBACK_URL,
      },
    },

    // Email configuration
    email: {
      sendgrid: {
        apiKey: env.SENDGRID_API_KEY,
      },
      from: env.FROM_EMAIL,
    },

    // Cloud storage configuration
    cloudinary: {
      cloudName: env.CLOUDINARY_CLOUD_NAME,
      apiKey: env.CLOUDINARY_API_KEY,
      apiSecret: env.CLOUDINARY_API_SECRET,
    },

    // Application configuration
    app: {
      nodeEnv: env.NODE_ENV,
      port: env.PORT,
      frontendUrl: env.FRONTEND_URL,
      isDevelopment: env.NODE_ENV === 'development',
      isProduction: env.NODE_ENV === 'production',
      isStaging: env.NODE_ENV === 'staging',
      isTest: env.NODE_ENV === 'test',
    },

    // CORS configuration
    cors: {
      origin: env.CORS_ORIGIN,
    },

    // Rate limiting configuration
    rateLimit: {
      ttl: env.RATE_LIMIT_TTL,
      max: env.RATE_LIMIT_MAX,
    },

    // WebSocket configuration
    websocket: {
      port: env.WS_PORT,
      path: env.WS_PATH,
    },

    // Logging configuration
    logging: {
      level: env.LOG_LEVEL || 'info',
    },

    // Security configuration
    security: {
      approvedDomains: env.APPROVED_DOMAINS,
      enableHttps: env.ENABLE_HTTPS || false,
      enableHelmet: env.ENABLE_HELMET !== false,
    },
  };
};

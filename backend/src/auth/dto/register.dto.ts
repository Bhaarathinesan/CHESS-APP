import { z } from 'zod';

export const RegisterDtoSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens',
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must not exceed 100 characters'),
  collegeName: z
    .string()
    .min(1, 'College name is required')
    .max(255, 'College name must not exceed 255 characters'),
  collegeDomain: z
    .string()
    .min(1, 'College domain is required')
    .max(255, 'College domain must not exceed 255 characters'),
});

export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

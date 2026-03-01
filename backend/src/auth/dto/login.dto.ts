import { z } from 'zod';

export const LoginDtoSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginDto = z.infer<typeof LoginDtoSchema>;

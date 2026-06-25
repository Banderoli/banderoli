import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Минимум 8 символов').max(100),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;

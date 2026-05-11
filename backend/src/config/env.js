import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3001').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AUTH_SECRET: z.string().min(32, "Auth secret should be at least 32 characters for security"),
  TOKEN_TTL_HOURS: z.string().default('12').transform(Number),
  CORS_ORIGINS: z.string().default('http://localhost:8080,http://127.0.0.1:8080').transform((s) => s.split(',').map(i => i.trim())),
  GEMINI_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),
  RESEND_TO_EMAIL: z.string().optional(),
  DATABASE_URL: z.string().url("Invalid database URL"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;

import * as z from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  ALLOWED_ORIGINS: z
    .string()
    .min(1)
    .transform((val) => val.split(',').map((s) => s.trim())),
  REDIS_URL: z.url(),
  DATABASE_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid environment variables:\n${formatted}`);
  }

  return result.data;
}

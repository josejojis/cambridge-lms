import 'dotenv/config'
import { z } from 'zod'

/** Validated configuration. The process refuses to start with missing or unsafe production settings. */
const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_ORIGIN: z.url().default('http://localhost:5000'),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.url().default('http://localhost:5000'),
  MAIL_PROVIDER: z.enum(['log', 'resend', 'smtp']).default('log'),
  MAIL_FROM: z.string().default('Elite Revision <no-reply@elite-revision.com>'),
  RESEND_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  AI_HINT_MODEL: z.string().default('claude-haiku-5-5'),
  AI_MARKING_MODEL: z.string().default('claude-sonnet-5-5'),
  SENTRY_DSN: z.string().optional(),
}).superRefine((e, ctx) => {
  if (e.NODE_ENV === 'production') {
    if (!e.APP_ORIGIN.startsWith('https://')) ctx.addIssue({ code: 'custom', path: ['APP_ORIGIN'], message: 'must be https in production' })
    if (e.MAIL_PROVIDER === 'log') ctx.addIssue({ code: 'custom', path: ['MAIL_PROVIDER'], message: 'a real mail provider is required in production' })
  }
})

export const env = Env.parse(process.env)
export const isProd = env.NODE_ENV === 'production'

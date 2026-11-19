import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import type { PrismaClient } from './generated/prisma/client'
import { catalogueRoutes } from './modules/curriculum/routes'
import { billingPublicRoutes } from './modules/billing/routes'

export async function buildApp(db: PrismaClient, opts: { logger?: boolean } = {}) {
  const app = Fastify({
    logger: opts.logger
      ? { redact: ['req.headers.cookie', 'req.headers.authorization', 'body.password', 'body.phone'] }
      : false,
    trustProxy: true,
  })

  await app.register(helmet, { contentSecurityPolicy: false }) // CSP is set on the SPA by Nginx in production
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' })

  app.setErrorHandler((err: { statusCode?: number; message?: string }, req, reply) => {
    req.log.error(err)
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500
    // Never leak internals (stack traces, SQL) to clients.
    reply.status(status).send({ error: status === 500 ? 'Internal server error' : err.message })
  })

  app.get('/api/v1/health', async () => {
    await db.$queryRaw`SELECT 1`
    return { status: 'ok', service: 'elite-revision-api', time: new Date().toISOString() }
  })

  await app.register(catalogueRoutes(db), { prefix: '/api/v1' })
  await app.register(billingPublicRoutes(db), { prefix: '/api/v1' })
  return app
}

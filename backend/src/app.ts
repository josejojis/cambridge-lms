import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import { hasZodFastifySchemaValidationErrors, jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import type { Db } from './lib/db'
import { captureError } from './lib/monitoring'
import { createAuth, registerAuth } from './modules/identity/auth'
import { identityRoutes } from './modules/identity/routes'
import { catalogueRoutes } from './modules/curriculum/routes'
import { billingPublicRoutes } from './modules/billing/routes'
import { assessmentRoutes } from './modules/assessment/routes'
import { learningRoutes } from './modules/learning/routes'
import { aiRoutes } from './modules/ai/routes'

export async function buildApp(db: Db, opts: { logger?: boolean } = {}) {
  const app = Fastify({
    logger: opts.logger
      ? { redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'] }
      : false,
    trustProxy: true,
    bodyLimit: 1_000_000,
  })
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(helmet, { contentSecurityPolicy: false }) // the SPA's CSP is set by the web server
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' })
  await app.register(swagger, {
    openapi: { info: { title: 'Elite Revision API', version: '0.2.0' }, servers: [{ url: '/' }] },
    transform: jsonSchemaTransform,
  })

  app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err))
      return reply.status(400).send({ error: 'Please check the highlighted fields.', issues: err.validation.map((v) => ({ path: String(v.instancePath ?? '').replace(/^\//, '').replaceAll('/', '.'), message: v.message ?? 'Invalid' })) })
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500
    if (status === 500) { req.log.error(err); captureError(err) }
    // Never leak internals (stack traces, SQL) to clients.
    return reply.status(status).send({ error: status === 500 ? 'Something went wrong. Please try again.' : err.message })
  })

  const auth = createAuth(db)
  await registerAuth(app, db, auth)

  app.get('/api/v1/health', { schema: { hide: true } }, async () => {
    await db.$queryRaw`SELECT 1`
    return { status: 'ok', service: 'elite-revision-api', time: new Date().toISOString() }
  })

  for (const plugin of [identityRoutes(db, auth), catalogueRoutes(db), billingPublicRoutes(db), assessmentRoutes(db), learningRoutes(db), aiRoutes(db)])
    await app.register(plugin, { prefix: '/api/v1' })

  return app
}

import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { fromNodeHeaders } from 'better-auth/node'
import { twoFactor, username } from 'better-auth/plugins'
import { passkey } from '@better-auth/passkey'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { Db } from '../../lib/db'
import { env, isProd } from '../../lib/env'
import { hashPassword, verifyPassword } from '../../lib/password'
import { enqueue, QUEUES } from '../../jobs'
import { loadPrincipal, type Principal } from './users'
import { defineAbilityFor, type AppAbility } from './ability'

/**
 * Authentication: Better Auth with server-side sessions in an HttpOnly cookie.
 *  - email + password for adults, username + password for learners (no email needed)
 *  - email verification and password reset links sent through the job queue
 *  - TOTP two-factor and passkeys (WebAuthn) for adult accounts
 *  - public sign-up is DISABLED here: accounts are created by our registration endpoints,
 *    which also assign roles and record consent (see routes.ts)
 */
export function createAuth(db: Db) {
  const origin = new URL(env.APP_ORIGIN)
  return betterAuth({
    appName: 'Elite Revision',
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_ORIGIN],
    database: prismaAdapter(db, { provider: 'postgresql' }),
    advanced: {
      database: { generateId: 'serial' },
      cookiePrefix: 'er',
      useSecureCookies: isProd,
      ipAddress: { ipAddressHeaders: ['x-forwarded-for'] },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    user: {
      additionalFields: {
        status: { type: 'string', input: false },
        emailIsPlaceholder: { type: 'boolean', input: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      password: { hash: hashPassword, verify: ({ hash, password }) => verifyPassword(password, hash) },
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await enqueue(QUEUES.email, {
          to: user.email, subject: 'Reset your Elite Revision password',
          text: `Hello ${user.name},\n\nUse this link to choose a new password (valid for 1 hour):\n${url}\n\nIf you did not ask for this, you can ignore this email.`,
        })
      },
    },
    emailVerification: {
      sendOnSignUp: false,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await enqueue(QUEUES.email, {
          to: user.email, subject: 'Confirm your email for Elite Revision',
          text: `Hello ${user.name},\n\nPlease confirm your email address:\n${url}`,
        })
      },
    },
    rateLimit: {
      enabled: env.NODE_ENV !== 'test', window: 60, max: 60,
      customRules: { '/sign-in/email': { window: 60, max: 5 }, '/sign-in/username': { window: 60, max: 5 }, '/request-password-reset': { window: 300, max: 3 } },
    },
    plugins: [
      username({ minUsernameLength: 3, maxUsernameLength: 30 }),
      twoFactor({ issuer: 'Elite Revision' }),
      passkey({ rpID: origin.hostname, rpName: 'Elite Revision', origin: env.APP_ORIGIN }),
    ],
    databaseHooks: {
      session: {
        create: {
          // Suspended or deactivated accounts can't sign in.
          before: async (session) => {
            const u = await db.user.findUnique({ where: { id: Number(session.userId) }, select: { status: true } })
            if (!u || u.status === 'suspended' || u.status === 'deactivated') return false
            await db.user.update({ where: { id: Number(session.userId) }, data: { lastLoginAt: new Date() } })
          },
        },
      },
    },
  })
}
export type Auth = ReturnType<typeof createAuth>

declare module 'fastify' {
  interface FastifyRequest { principal: Principal | null; ability: AppAbility | null }
}

/** Mounts Better Auth at /api/auth/* and resolves the session for every API request. */
export async function registerAuth(app: FastifyInstance, db: Db, auth: Auth) {
  app.decorateRequest('principal', null)
  app.decorateRequest('ability', null)

  app.route({
    method: ['GET', 'POST'], url: '/api/auth/*',
    async handler(req, reply) {
      const url = new URL(req.url, env.BETTER_AUTH_URL)
      const request = new Request(url, {
        method: req.method, headers: fromNodeHeaders(req.headers),
        body: req.method === 'GET' || req.body == null ? undefined : JSON.stringify(req.body),
      })
      const res = await auth.handler(request)
      reply.status(res.status)
      const cookies = res.headers.getSetCookie()
      res.headers.forEach((v, k) => { if (k !== 'set-cookie') reply.header(k, v) })
      if (cookies.length) reply.header('set-cookie', cookies)
      return reply.send(res.body ? await res.text() : null)
    },
  })

  // CSRF: state-changing requests must come from our own origin (SameSite=Lax cookies + Origin check)
  app.addHook('onRequest', async (req, reply) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.url.startsWith('/api/v1/payments/callbacks')) return
    const o = req.headers.origin ?? (req.headers.referer ? new URL(req.headers.referer).origin : undefined)
    if (o && o !== env.APP_ORIGIN) return reply.code(403).send({ error: 'Cross-site request blocked' })
  })

  app.addHook('preHandler', async (req) => {
    if (!req.url.startsWith('/api/v1/')) return
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
    if (!session) return
    const p = await loadPrincipal(db, Number(session.user.id))
    if (!p) return
    req.principal = p
    req.ability = defineAbilityFor(p)
  })
}

export function requireUser(req: FastifyRequest, reply: FastifyReply): Principal {
  if (!req.principal) { reply.code(401); throw Object.assign(new Error('Please sign in.'), { statusCode: 401 }) }
  return req.principal
}

export function requirePermission(req: FastifyRequest, reply: FastifyReply, permission: string): Principal {
  const p = requireUser(req, reply)
  if (!p.permissions.includes(permission)) throw Object.assign(new Error('You do not have permission to do that.'), { statusCode: 403 })
  return p
}

import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { LinkDecision, Me, primaryRole, RegisterLearner, RegisterParent, ROLE_HOME } from '@elite/shared'
import { asUser, type Db } from '../../lib/db'
import { enqueue, QUEUES } from '../../jobs'
import type { Auth } from './auth'
import { requireUser } from './auth'
import { createCredentialUser, loadPrincipal, type Principal } from './users'
import { subject } from './ability'

const TERMS_VERSION = '2026-11'
const toMe = (p: Principal): z.infer<typeof Me> => ({
  id: p.id, name: p.name, email: p.email, username: p.username, status: p.status,
  roles: p.roles, permissions: p.permissions, home: ROLE_HOME[primaryRole(p.roles)], twoFactorEnabled: p.twoFactorEnabled,
})
const conflict = (m: string) => Object.assign(new Error(m), { statusCode: 409 })

/** Age in whole years from year + month (we never store the day). */
export const ageFrom = (year: number, month: number, now = new Date()) =>
  now.getFullYear() - year - (now.getMonth() + 1 < month ? 1 : 0)

export const identityRoutes = (db: Db, auth: Auth): FastifyPluginAsync => async (base) => {
  const app = base.withTypeProvider<ZodTypeProvider>()

  /** Signs the new account in by calling Better Auth, then copies its session cookie onto our reply. */
  async function signIn(reply: import('fastify').FastifyReply, body: { email: string } | { username: string }, password: string) {
    const res = 'email' in body
      ? await auth.api.signInEmail({ body: { email: body.email, password }, asResponse: true })
      : await auth.api.signInUsername({ body: { username: body.username, password }, asResponse: true })
    const cookies = res.headers.getSetCookie()
    if (cookies.length) reply.header('set-cookie', cookies)
  }

  app.post('/register/parent', { schema: { tags: ['identity'], body: RegisterParent, response: { 201: Me } } }, async (req, reply) => {
    const b = req.body
    if (await db.user.findUnique({ where: { email: b.email.toLowerCase() } })) throw conflict('An account with this email already exists.')
    const user = await createCredentialUser(db, { name: b.name, email: b.email.toLowerCase(), password: b.password, roles: ['parent'] })
    await db.parentProfile.create({ data: { userId: user.id } })
    await db.consent.createMany({ data: ['terms', 'privacy'].map((type) => ({ userId: user.id, type, version: TERMS_VERSION })) })
    // Learners who named this email before the parent had an account → pending link requests
    const invites = await db.guardianInvite.findMany({ where: { email: user.email, consumedAt: null } })
    for (const inv of invites) {
      await db.parentLearnerLink.upsert({ where: { parentId_learnerId: { parentId: user.id, learnerId: inv.learnerId } }, update: {}, create: { parentId: user.id, learnerId: inv.learnerId } })
      await db.guardianInvite.update({ where: { id: inv.id }, data: { consumedAt: new Date() } })
    }
    await auth.api.sendVerificationEmail({ body: { email: user.email, callbackURL: '/parent' } })
    await signIn(reply, { email: user.email }, b.password)
    reply.code(201)
    return toMe((await loadPrincipal(db, user.id))!)
  })

  app.post('/register/learner', { schema: { tags: ['identity'], body: RegisterLearner, response: { 201: Me } } }, async (req, reply) => {
    const b = req.body
    const uname = b.username.toLowerCase()
    if (await db.user.findUnique({ where: { username: uname } })) throw conflict('That username is taken.')
    const curriculum = await db.curriculum.findUniqueOrThrow({ where: { code: b.curriculum } })
    const level = await db.academicLevel.findUnique({ where: { curriculumId_code: { curriculumId: curriculum.id, code: b.levelCode } } })
    if (!level) throw Object.assign(new Error('Unknown grade or level.'), { statusCode: 400 })

    const minor = ageFrom(b.birthYear, b.birthMonth) < 18
    const user = await createCredentialUser(db, { name: b.name, username: uname, password: b.password, roles: ['learner'], status: minor ? 'pending_guardian' : 'active' })
    await db.learnerProfile.create({ data: { userId: user.id, curriculumId: curriculum.id, levelId: level.id, birthYear: b.birthYear, birthMonth: b.birthMonth } })
    await db.consent.createMany({ data: ['terms', 'privacy'].map((type) => ({ userId: user.id, type, version: TERMS_VERSION })) })

    if (b.parentEmail) {
      const parent = await db.user.findUnique({ where: { email: b.parentEmail.toLowerCase() }, include: { roles: { include: { role: true } } } })
      if (parent?.roles.some((r) => r.role.slug === 'parent')) {
        await db.parentLearnerLink.create({ data: { parentId: parent.id, learnerId: user.id } })
        await enqueue(QUEUES.notify, { userId: parent.id, type: 'link_request', data: { message: `${b.name} asked to link to your account.`, learnerId: user.id } })
      } else {
        await db.guardianInvite.create({ data: { learnerId: user.id, email: b.parentEmail.toLowerCase() } })
      }
      // Same message whether or not the parent has an account (no account enumeration)
      await enqueue(QUEUES.email, {
        to: b.parentEmail, subject: `${b.name} wants to start revising on Elite Revision`,
        text: `${b.name} has created an Elite Revision learner account and named you as their parent or guardian.\n\n` +
          `Sign in or create a parent account at ${process.env.APP_ORIGIN}/register?role=parent to approve it.` +
          (minor ? '\n\nBecause they are under 18, their learning stays locked until you give consent.' : ''),
      })
    }
    await signIn(reply, { username: uname }, b.password)
    reply.code(201)
    return toMe((await loadPrincipal(db, user.id))!)
  })

  app.get('/me', { schema: { tags: ['identity'], response: { 200: Me } } }, async (req, reply) => toMe(requireUser(req, reply)))

  // ── Parent: approve or reject link requests (gives guardian consent under the Kenya DPA) ──
  app.get('/parent/link-requests', { schema: { tags: ['parent'] } }, async (req, reply) => {
    const p = requireUser(req, reply)
    if (!p.roles.includes('parent')) throw Object.assign(new Error('Parents only.'), { statusCode: 403 })
    const links = await db.parentLearnerLink.findMany({ where: { parentId: p.id, status: 'pending' }, include: { learner: { select: { id: true, name: true, username: true, createdAt: true } } } })
    return { data: links.map((l) => ({ learnerId: l.learnerId, name: l.learner.name, username: l.learner.username, requestedAt: l.createdAt })) }
  })

  app.post('/parent/link-requests/:learnerId', { schema: { tags: ['parent'], params: z.object({ learnerId: z.coerce.number() }), body: LinkDecision } }, async (req, reply) => {
    const p = requireUser(req, reply)
    const link = await db.parentLearnerLink.findUnique({ where: { parentId_learnerId: { parentId: p.id, learnerId: req.params.learnerId } } })
    if (!link || link.status !== 'pending' || !req.ability?.can('approve', subject('ParentLink', { parentId: link.parentId })))
      throw Object.assign(new Error('Link request not found.'), { statusCode: 404 })

    if (req.body.decision === 'reject') {
      await db.parentLearnerLink.update({ where: { id: link.id }, data: { status: 'revoked' } })
      await db.auditLog.create({ data: { actorId: p.id, action: 'parent_link.rejected', entityType: 'user', entityId: String(link.learnerId) } })
      return { status: 'revoked' }
    }
    await db.$transaction([
      db.parentLearnerLink.update({ where: { id: link.id }, data: { status: 'active', verifiedAt: new Date() } }),
      db.consent.create({ data: { userId: p.id, subjectUserId: link.learnerId, type: 'guardian_data_processing', version: TERMS_VERSION } }),
      db.user.updateMany({ where: { id: link.learnerId, status: 'pending_guardian' }, data: { status: 'active' } }),
      db.auditLog.create({ data: { actorId: p.id, action: 'parent_link.approved', entityType: 'user', entityId: String(link.learnerId), newValues: { consent: 'guardian_data_processing' } } }),
    ])
    await enqueue(QUEUES.notify, { userId: link.learnerId, type: 'account_approved', data: { message: 'Your parent approved your account. You can start learning!' } })
    return { status: 'active' }
  })

  /** Linked children with progress. Runs under row-level security as the parent. */
  app.get('/parent/children', { schema: { tags: ['parent'] } }, async (req, reply) => {
    const p = requireUser(req, reply)
    const data = await asUser(db, { userId: p.id }, async (tx) => {
      const profiles = await tx.learnerProfile.findMany({ where: { userId: { in: p.childIds } }, include: { user: { select: { id: true, name: true, username: true, status: true } }, level: true, curriculum: true } })
      return Promise.all(profiles.map(async (lp) => {
        const [completed, results, weak] = await Promise.all([
          tx.lessonProgress.count({ where: { learnerId: lp.userId, status: 'completed' } }),
          tx.assessmentResult.findMany({ where: { attempt: { learnerId: lp.userId }, releasedAt: { not: null } }, include: { attempt: { include: { assessment: { select: { title: true } } } } }, orderBy: { attempt: { submittedAt: 'desc' } }, take: 5 }),
          tx.topicPerformance.findMany({ where: { learnerId: lp.userId, avgPct: { lt: 60 } }, include: { topic: { select: { title: true } } }, orderBy: { avgPct: 'asc' }, take: 5 }),
        ])
        return {
          id: lp.user.id, name: lp.user.name, username: lp.user.username, status: lp.user.status,
          curriculum: lp.curriculum?.name, level: lp.level?.name, lessonsCompleted: completed,
          recentResults: results.map((r) => ({ assessment: r.attempt.assessment.title, percentage: r.percentage, passed: r.passed, date: r.attempt.submittedAt })),
          weakTopics: weak.map((w) => ({ topic: w.topic.title, averagePct: w.avgPct })),
        }
      }))
    })
    return { data }
  })
}

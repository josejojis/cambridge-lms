import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { SaveAnswers } from '@elite/shared'
import type { Db } from '../../lib/db'
import { enqueue, QUEUES } from '../../jobs'
import { requireUser } from '../identity/auth'
import { getAttemptForLearner, saveAnswers, startAttempt, submitAttempt } from './attempts'

export const assessmentRoutes = (db: Db): FastifyPluginAsync => async (base) => {
  const app = base.withTypeProvider<ZodTypeProvider>()
  const AttemptId = z.object({ attemptId: z.uuid() })

  app.post('/assessments/:assessmentId/attempts', { schema: { tags: ['assessment'], params: z.object({ assessmentId: z.coerce.number() }) } }, async (req, reply) => {
    const p = requireUser(req, reply)
    if (!req.ability?.can('take', 'Assessment')) throw Object.assign(new Error('You cannot take assessments yet.'), { statusCode: 403 })
    const at = await startAttempt(db, p, req.params.assessmentId)
    reply.code(201)
    return { id: at.publicId, status: at.status, deadlineAt: at.deadlineAt }
  })

  app.get('/attempts/:attemptId', { schema: { tags: ['assessment'], params: AttemptId } }, async (req, reply) =>
    getAttemptForLearner(db, requireUser(req, reply).id, req.params.attemptId))

  // Autosave (and offline replay). PUT because it is idempotent.
  app.put('/attempts/:attemptId/answers', {
    schema: { tags: ['assessment'], params: AttemptId, body: SaveAnswers },
    config: { rateLimit: { max: 120, timeWindow: '1 minute' } },
  }, async (req, reply) => saveAnswers(db, requireUser(req, reply).id, req.params.attemptId, req.body))

  app.post('/attempts/:attemptId/submit', { schema: { tags: ['assessment'], params: AttemptId } }, async (req, reply) => {
    const p = requireUser(req, reply)
    const r = await submitAttempt(db, req.params.attemptId, { learnerId: p.id, reason: 'learner' })
    if (!r.alreadySubmitted) await enqueue(QUEUES.attemptMarked, { attemptId: r.attemptId })
    return { status: r.status, alreadySubmitted: r.alreadySubmitted }
  })
}

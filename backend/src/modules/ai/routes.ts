import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { HintRequest, MarkingSuggestionRequest } from '@elite/shared'
import type { Db } from '../../lib/db'
import { requirePermission } from '../identity/auth'
import { subject } from '../identity/ability'
import { generateHint, mapAiError, suggestMarking } from './service'

export const aiRoutes = (db: Db): FastifyPluginAsync => async (base) => {
  const app = base.withTypeProvider<ZodTypeProvider>()
  const limit = { rateLimit: { max: 10, timeWindow: '1 minute' } }

  app.post('/ai/hints', { schema: { tags: ['ai'], body: HintRequest }, config: limit }, async (req, reply) => {
    const p = requirePermission(req, reply, 'ai.hints')
    try { return await generateHint(db, p.id, req.body.questionId, req.body.attemptId) } catch (e) { throw mapAiError(e) }
  })

  app.post('/ai/marking-suggestions', { schema: { tags: ['ai'], body: MarkingSuggestionRequest }, config: limit }, async (req, reply) => {
    const p = requirePermission(req, reply, 'ai.marking_suggestions')
    // Teachers may only request suggestions for classes they can mark.
    const ans = await db.learnerAnswer.findUnique({ where: { id: req.body.answerId }, include: { attempt: { include: { assessment: { select: { classId: true } } } } } })
    if (!ans || !req.ability?.can('mark', subject('Attempt', { classId: ans.attempt.assessment.classId })))
      throw Object.assign(new Error('Answer not found.'), { statusCode: 404 })
    try { return await suggestMarking(db, p.id, req.body.answerId) } catch (e) { throw mapAiError(e) }
  })
}

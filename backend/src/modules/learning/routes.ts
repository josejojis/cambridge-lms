import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { ReviewGrade } from '@elite/shared'
import type { Db } from '../../lib/db'
import { requireUser } from '../identity/auth'
import { dueTopics, ratingFromLabel, reviewTopic } from './srs'

export const learningRoutes = (db: Db): FastifyPluginAsync => async (base) => {
  const app = base.withTypeProvider<ZodTypeProvider>()

  /** "Revise today": topics the spaced-repetition schedule says are due. */
  app.get('/me/revision', { schema: { tags: ['learning'] } }, async (req, reply) => ({ data: await dueTopics(db, requireUser(req, reply).id) }))

  /** Learner self-rates a revision session for a topic. */
  app.post('/me/revision/review', { schema: { tags: ['learning'], body: ReviewGrade } }, async (req, reply) => {
    const p = requireUser(req, reply)
    const card = await reviewTopic(db, p.id, req.body.topicId, ratingFromLabel(req.body.rating))
    return { nextDue: card.due }
  })
}

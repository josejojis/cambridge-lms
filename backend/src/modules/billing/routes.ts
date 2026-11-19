import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { PlansResponse } from '@elite/shared'
import type { Db } from '../../lib/db'

/** Public list of active subscription plans (no internal fields). */
export const billingPublicRoutes = (db: Db): FastifyPluginAsync => async (base) => {
  const app = base.withTypeProvider<ZodTypeProvider>()
  app.get('/plans', { schema: { tags: ['billing'], response: { 200: PlansResponse } } }, async () => {
    const plans = await db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
    return {
      data: plans.map((p) => ({
        slug: p.slug, name: p.name, description: p.description, priceMinor: p.priceMinor, currency: p.currency,
        billingPeriod: p.billingPeriod, trialDays: p.trialDays, maxLearners: p.maxLearners, features: p.features as string[],
      })),
    }
  })
}

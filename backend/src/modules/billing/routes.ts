import type { FastifyPluginAsync } from 'fastify'
import type { PrismaClient } from '../../generated/prisma/client'

/** Public list of active subscription plans (no internal fields). */
export const billingPublicRoutes = (db: PrismaClient): FastifyPluginAsync => async (app) => {
  app.get('/plans', async () => {
    const plans = await db.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
    return {
      data: plans.map((p) => ({
        slug: p.slug, name: p.name, description: p.description, priceMinor: p.priceMinor, currency: p.currency,
        billingPeriod: p.billingPeriod, trialDays: p.trialDays, maxLearners: p.maxLearners, features: p.features,
      })),
    }
  })
}

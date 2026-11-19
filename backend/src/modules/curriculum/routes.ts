import type { FastifyPluginAsync } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { CatalogueResponse } from '@elite/shared'
import type { Db } from '../../lib/db'

/** Public, read-only catalogue: curricula → levels → subject offerings with published course counts. */
export const catalogueRoutes = (db: Db): FastifyPluginAsync => async (base) => {
  const app = base.withTypeProvider<ZodTypeProvider>()
  app.get('/catalogue', { schema: { tags: ['catalogue'], response: { 200: CatalogueResponse } } }, async (_req, reply) => {
    reply.header('cache-control', 'public, max-age=300')
    const curricula = await db.curriculum.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      include: {
        levels: { where: { parentId: null }, orderBy: { sortOrder: 'asc' }, include: { children: { orderBy: { sortOrder: 'asc' } } } },
        subjects: {
          where: { isActive: true },
          orderBy: [{ level: { sortOrder: 'asc' } }, { subject: { name: 'asc' } }],
          include: {
            subject: true, level: true,
            _count: { select: { units: true } },
            courses: { where: { status: 'published' }, select: { title: true, slug: true, summary: true, _count: { select: { lessons: true } } } },
          },
        },
      },
    })
    return {
      data: curricula.map((c) => ({
        code: c.code, name: c.name, labels: c.labels as Record<string, string>,
        levels: c.levels.map((l) => ({ name: l.name, code: l.code, kind: l.kind, children: l.children.map((ch) => ({ name: ch.name, code: ch.code })) })),
        offerings: c.subjects.map((o) => ({
          subject: o.subject.name, slug: o.subject.slug, icon: o.subject.icon, level: o.level.name, levelCode: o.level.code, units: o._count.units,
          courses: o.courses.map((co) => ({ title: co.title, slug: co.slug, summary: co.summary, lessons: co._count.lessons })),
        })),
      })),
    }
  })
}

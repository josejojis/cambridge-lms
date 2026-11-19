import type { FastifyPluginAsync } from 'fastify'
import type { PrismaClient } from '../../generated/prisma/client'

/** Public, read-only catalogue: curricula → levels → subject offerings with published course counts. */
export const catalogueRoutes = (db: PrismaClient): FastifyPluginAsync => async (app) => {
  app.get('/catalogue', async () => {
    const curricula = await db.curriculum.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
      include: {
        levels: { where: { parentId: null }, orderBy: { sortOrder: 'asc' }, include: { children: { orderBy: { sortOrder: 'asc' } } } },
        subjects: {
          where: { isActive: true },
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
        code: c.code, name: c.name, labels: c.labels,
        levels: c.levels.map((l) => ({ name: l.name, code: l.code, kind: l.kind, children: l.children.map((ch) => ({ name: ch.name, code: ch.code })) })),
        offerings: c.subjects.map((o) => ({
          subject: o.subject.name, slug: o.subject.slug, icon: o.subject.icon, level: o.level.name, units: o._count.units,
          courses: o.courses.map((co) => ({ title: co.title, slug: co.slug, summary: co.summary, lessons: co._count.lessons })),
        })),
      })),
    }
  })
}

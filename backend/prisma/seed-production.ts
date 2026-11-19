/**
 * PRODUCTION REFERENCE SEED: safe to run on every deploy (idempotent).
 *
 * Loads only what a fresh production system needs:
 *   - roles and permissions (kept in sync with @elite/shared)
 *   - Cambridge and CBC curriculum STRUCTURE (stages, grades and subject offerings; no syllabus content)
 *   - the subject catalogue
 *   - default platform settings (only keys that don't exist yet; admin edits are never overwritten)
 *   - plan templates (only if missing; paid plans start INACTIVE at price 0 until an admin prices them)
 *   - the first Main Administrator, from ADMIN_EMAIL / ADMIN_NAME / ADMIN_INITIAL_PASSWORD
 *
 * Creates NO learners, parents, results or payments.
 */
import 'dotenv/config'
import { pathToFileURL } from 'node:url'
import { CURRICULA, DEFAULT_SETTINGS, PLAN_TEMPLATES, ROLES, SUBJECTS, PERMISSIONS, type LevelSpec } from '@elite/shared'
import { createDb, type Db } from '../src/lib/db'
import { createCredentialUser } from '../src/modules/identity/users'

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export async function seedReference(db: Db, log = console.log) {
  // Permissions & roles
  for (const [module, slugs] of Object.entries(PERMISSIONS))
    for (const slug of slugs) await db.permission.upsert({ where: { slug }, update: { module }, create: { slug, module } })
  const permIds = Object.fromEntries((await db.permission.findMany()).map((p) => [p.slug, p.id]))
  for (const [slug, r] of Object.entries(ROLES)) {
    const role = await db.role.upsert({ where: { slug }, update: { name: r.name, description: r.description }, create: { slug, name: r.name, description: r.description } })
    await db.rolePermission.deleteMany({ where: { roleId: role.id } })
    await db.rolePermission.createMany({ data: r.permissions.map((p) => ({ roleId: role.id, permissionId: permIds[p] })) })
  }

  // Subjects
  for (const s of SUBJECTS)
    await db.subject.upsert({ where: { name: s.name }, update: {}, create: { name: s.name, slug: slugify(s.name), icon: s.icon } })
  const subjectIds = Object.fromEntries((await db.subject.findMany()).map((s) => [s.name, s.id]))

  // Curricula, level trees, offerings
  for (const c of CURRICULA) {
    const cur = await db.curriculum.upsert({ where: { code: c.code }, update: {}, create: { code: c.code, name: c.name, labels: c.labels } })
    const upsertLevel = async (l: LevelSpec, sortOrder: number, parentId?: number) => {
      const row = await db.academicLevel.upsert({
        where: { curriculumId_code: { curriculumId: cur.id, code: l.code } },
        update: {},
        create: { curriculumId: cur.id, code: l.code, name: l.name, kind: l.kind, sortOrder, parentId },
      })
      for (const [i, child] of (l.children ?? []).entries()) await upsertLevel(child, i, row.id)
    }
    for (const [i, l] of c.levels.entries()) await upsertLevel(l, i)

    const levelIds = Object.fromEntries((await db.academicLevel.findMany({ where: { curriculumId: cur.id } })).map((l) => [l.code, l.id]))
    for (const [levelCode, subjects] of Object.entries(c.offerings))
      for (const name of subjects)
        await db.curriculumSubject.upsert({
          where: { levelId_subjectId: { levelId: levelIds[levelCode], subjectId: subjectIds[name] } },
          update: {},
          create: { curriculumId: cur.id, levelId: levelIds[levelCode], subjectId: subjectIds[name] },
        })
  }

  // Settings: insert missing keys only
  for (const s of DEFAULT_SETTINGS)
    await db.systemSetting.upsert({ where: { key: s.key }, update: {}, create: { key: s.key, value: s.value as never, isPublic: s.isPublic } })

  // Plan templates: insert missing only
  for (const [i, p] of PLAN_TEMPLATES.entries())
    await db.subscriptionPlan.upsert({
      where: { slug: p.slug }, update: {},
      create: { slug: p.slug, name: p.name, billingPeriod: p.billingPeriod, periodDays: p.periodDays, maxLearners: p.maxLearners,
        isActive: p.isActive, features: [...p.features], priceMinor: 0, currency: 'KES', sortOrder: i,
        description: p.isActive ? 'Start learning for free.' : 'Price to be set by an administrator before activation.' },
    })
  const free = await db.subscriptionPlan.findUniqueOrThrow({ where: { slug: 'free' } })
  if (!(await db.planEntitlement.count({ where: { planId: free.id } })))
    log('  note: Free plan has no entitlements yet. Assign sample courses in the admin panel once content exists.')

  log(`  reference data: ${await db.role.count()} roles, ${await db.permission.count()} permissions, ${await db.academicLevel.count()} levels, ` +
    `${await db.subject.count()} subjects, ${await db.curriculumSubject.count()} subject offerings, ${await db.systemSetting.count()} settings, ${await db.subscriptionPlan.count()} plans`)
}

export async function seedFirstAdmin(db: Db, log = console.log) {
  const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_INITIAL_PASSWORD
  if (!email || !password) { log('  ADMIN_EMAIL / ADMIN_INITIAL_PASSWORD not set: skipping first admin.'); return }
  if (await db.user.findUnique({ where: { email } })) { log(`  admin ${email} already exists: unchanged.`); return }
  if (password.length < 14) throw new Error('ADMIN_INITIAL_PASSWORD must be at least 14 characters.')
  await createCredentialUser(db, { name: process.env.ADMIN_NAME ?? 'Main Administrator', email, password, roles: ['super_admin'], emailVerified: true })
  await db.auditLog.create({ data: { action: 'admin.bootstrap', entityType: 'user', newValues: { email } } })
  log(`  created first admin ${email}. Sign in, change the password and enable two-factor authentication.`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const db = createDb()
  console.log('Seeding production reference data…')
  seedReference(db).then(() => seedFirstAdmin(db))
    .catch((e) => { console.error(e); process.exitCode = 1 })
    .finally(() => db.$disconnect())
}

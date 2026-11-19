import type { RoleSlug } from '@elite/shared'
import type { Db } from '../../lib/db'
import { hashPassword } from '../../lib/password'

export const placeholderEmail = (username: string) => `${username.toLowerCase()}@learners.elite-revision.invalid`

/**
 * Creates a user with a Better Auth "credential" account and roles, in one transaction.
 * Used by seeds and admin tooling. Public sign-up goes through Better Auth's endpoints.
 */
export async function createCredentialUser(db: Db, u: {
  name: string; password: string; roles: RoleSlug[]; email?: string; username?: string
  emailVerified?: boolean; status?: 'active' | 'pending_guardian'; isTestData?: boolean
}) {
  if (!u.email && !u.username) throw new Error('email or username required')
  const passwordHash = await hashPassword(u.password)
  const roles = await db.role.findMany({ where: { slug: { in: u.roles } } })
  if (roles.length !== u.roles.length) throw new Error(`Unknown role in ${u.roles.join(',')}. Run the reference seed first.`)
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: u.name, email: u.email ?? placeholderEmail(u.username!), emailIsPlaceholder: !u.email,
        emailVerified: u.emailVerified ?? false, username: u.username?.toLowerCase(), displayUsername: u.username,
        status: u.status ?? 'active', isTestData: u.isTestData ?? false,
        roles: { create: roles.map((r) => ({ roleId: r.id })) },
      },
    })
    await tx.account.create({ data: { userId: user.id, accountId: String(user.id), providerId: 'credential', password: passwordHash } })
    return user
  })
}

/** Loads everything authorization needs about a user in one round trip. */
export async function loadPrincipal(db: Db, userId: number) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      childLinks: { where: { status: 'active' }, select: { learnerId: true } },
      teacherAssignments: { select: { classId: true, curriculumSubjectId: true, class: { select: { learners: { select: { learnerId: true } } } } } },
    },
  })
  if (!user) return null
  const roles = user.roles.map((r) => r.role.slug)
  const permissions = [...new Set(user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.slug)))]
  return {
    id: user.id, name: user.name, email: user.emailIsPlaceholder ? null : user.email, username: user.username,
    status: user.status, twoFactorEnabled: user.twoFactorEnabled, roles, permissions,
    childIds: user.childLinks.map((l) => l.learnerId),
    classIds: [...new Set(user.teacherAssignments.map((a) => a.classId))],
    taughtLearnerIds: [...new Set(user.teacherAssignments.flatMap((a) => a.class.learners.map((l) => l.learnerId)))],
  }
}
export type Principal = NonNullable<Awaited<ReturnType<typeof loadPrincipal>>>

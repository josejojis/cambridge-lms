import { AbilityBuilder, createMongoAbility, subject as caslSubject, type MongoAbility } from '@casl/ability'
import type { Principal } from './users'

/**
 * Authorization policies (CASL). Combines role permissions with RELATIONSHIPS:
 *  - learners see their own records
 *  - parents see records of ACTIVELY linked children only
 *  - teachers see learners in classes they are assigned to, and mark attempts for those classes
 * PostgreSQL row-level security enforces the same rules again underneath (see `asUser`).
 */
type Actions = 'manage' | 'read' | 'create' | 'update' | 'delete' | 'publish' | 'mark' | 'release' | 'take' | 'approve'
type Subjects =
  | 'all' | 'User' | 'Curriculum' | 'Content' | 'Question' | 'Assessment' | 'Attempt' | 'LearnerRecord'
  | 'ParentLink' | 'Plan' | 'Payment' | 'Subscription' | 'Setting' | 'AuditLog' | 'Announcement' | 'Report'
  | Record<PropertyKey, unknown>
export type AppAbility = MongoAbility<[Actions, Subjects]>

export function defineAbilityFor(p: Principal): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility)
  const has = (perm: string) => p.permissions.includes(perm)

  if (p.status === 'suspended' || p.status === 'deactivated') return build()
  if (p.roles.includes('super_admin')) { can('manage', 'all'); return build() }

  if (has('users.view')) can('read', 'User')
  if (has('users.manage')) can(['create', 'update'], 'User')
  if (has('curriculum.view')) can('read', 'Curriculum')
  if (has('curriculum.manage')) can('manage', 'Curriculum')
  if (has('content.view')) can('read', 'Content', { status: 'published' })
  if (has('content.create')) { can(['create', 'update'], 'Content'); can('read', 'Content') }
  if (has('content.publish')) can('publish', 'Content')
  if (has('questions.manage')) can('manage', 'Question')
  if (has('announcements.manage')) can('manage', 'Announcement')
  if (has('payments.view')) can('read', 'Payment')
  if (has('plans.manage')) can('manage', 'Plan')
  if (has('settings.manage')) can('manage', 'Setting')
  if (has('audit.view')) can('read', 'AuditLog')

  // Learner: own records; can only take assessments once a guardian has approved (Kenya DPA)
  if (p.roles.includes('learner')) {
    can('read', 'LearnerRecord', { learnerId: p.id })
    if (p.status === 'active') can('take', 'Assessment')
    else cannot('read', 'Content', { status: 'published' })
  }

  // Parent: actively linked children only
  if (p.roles.includes('parent')) {
    can('read', 'LearnerRecord', { learnerId: { $in: p.childIds } })
    can('read', 'Report', { learnerId: { $in: p.childIds } })
    can('approve', 'ParentLink', { parentId: p.id })
    can('read', 'Subscription', { payerId: p.id })
    can('read', 'Payment', { payerId: p.id })
  }

  // Teacher: assigned classes only
  if (p.roles.includes('teacher')) {
    can('read', 'LearnerRecord', { learnerId: { $in: p.taughtLearnerIds } })
    can('read', 'Report', { learnerId: { $in: p.taughtLearnerIds } })
    if (has('attempts.mark')) can('mark', 'Attempt', { classId: { $in: p.classIds } })
    if (has('results.release')) can('release', 'Attempt', { classId: { $in: p.classIds } })
    if (has('assessments.manage')) can(['create', 'update'], 'Assessment', { classId: { $in: p.classIds } })
  }
  if (has('assessments.manage') && p.roles.includes('content_editor')) can('manage', 'Assessment')

  return build()
}

/** Tags a plain object with a CASL subject type for condition checks (CASL's own helper). */
export const subject = <T extends Record<string, unknown>>(type: Exclude<Subjects, 'all' | object>, obj: T) =>
  caslSubject(type, { ...obj }) as unknown as Subjects

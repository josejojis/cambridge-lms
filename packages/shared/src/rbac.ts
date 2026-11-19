/** Roles and permissions: the single source of truth for API checks, seeding and UI gating. */

export const PERMISSIONS = {
  users: ['users.view', 'users.manage', 'roles.manage'],
  curriculum: ['curriculum.view', 'curriculum.manage'],
  content: ['content.view', 'content.create', 'content.publish', 'resources.upload'],
  assessment: ['questions.manage', 'assessments.manage', 'assessments.take', 'attempts.mark', 'results.release', 'results.view_own'],
  classroom: ['classes.manage', 'classes.view_assigned'],
  reporting: ['reports.platform', 'reports.class', 'reports.child'],
  billing: ['plans.manage', 'payments.view', 'payments.reconcile', 'subscriptions.manage_own'],
  communication: ['announcements.manage', 'notifications.send', 'support.manage', 'support.create'],
  platform: ['settings.manage', 'audit.view'],
  ai: ['ai.hints', 'ai.marking_suggestions', 'ai.question_drafts'],
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS][number]
export const ALL_PERMISSIONS = Object.values(PERMISSIONS).flat() as Permission[]

export const ROLE_SLUGS = ['super_admin', 'content_editor', 'teacher', 'parent', 'learner'] as const
export type RoleSlug = (typeof ROLE_SLUGS)[number]

export const ROLES: Record<RoleSlug, { name: string; description: string; permissions: Permission[] }> = {
  super_admin: { name: 'Main Administrator', description: 'Full platform access', permissions: ALL_PERMISSIONS },
  content_editor: {
    name: 'Content Editor', description: 'Creates and maintains learning content and questions',
    permissions: ['curriculum.view', 'content.view', 'content.create', 'resources.upload', 'questions.manage', 'assessments.manage', 'support.create', 'ai.question_drafts'],
  },
  teacher: {
    name: 'Teacher', description: 'Teaches assigned classes and marks work',
    permissions: ['curriculum.view', 'content.view', 'classes.view_assigned', 'assessments.manage', 'attempts.mark', 'results.release', 'reports.class', 'support.create', 'ai.marking_suggestions'],
  },
  parent: {
    name: 'Parent', description: 'Monitors linked children and manages subscriptions',
    permissions: ['reports.child', 'subscriptions.manage_own', 'support.create'],
  },
  learner: {
    name: 'Learner', description: 'Studies, practises and sits assessments',
    permissions: ['curriculum.view', 'content.view', 'assessments.take', 'results.view_own', 'support.create', 'ai.hints'],
  },
}

/** Where each role lands after login. */
export const ROLE_HOME: Record<RoleSlug, string> = {
  super_admin: '/admin', content_editor: '/admin', teacher: '/teacher', parent: '/parent', learner: '/learn',
}

/** Highest-privilege role first: used to pick a home when a user has several roles. */
export const primaryRole = (roles: string[]): RoleSlug =>
  (ROLE_SLUGS.find((r) => roles.includes(r)) ?? 'learner')

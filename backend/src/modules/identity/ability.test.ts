import { describe, expect, it } from 'vitest'
import { ROLES } from '@elite/shared'
import { defineAbilityFor, subject } from './ability'
import type { Principal } from './users'

const base = (over: Partial<Principal>): Principal => ({
  id: 1, name: 'x', email: null, username: 'x', status: 'active', twoFactorEnabled: false,
  roles: [], permissions: [], childIds: [], classIds: [], taughtLearnerIds: [], ...over,
})
const as = (role: keyof typeof ROLES, over: Partial<Principal> = {}) =>
  defineAbilityFor(base({ roles: [role], permissions: ROLES[role].permissions, ...over }))
const record = (learnerId: number) => subject('LearnerRecord', { learnerId })

describe('authorization policies', () => {
  it('parent sees only actively linked children', () => {
    const a = as('parent', { id: 10, childIds: [21, 22] })
    expect(a.can('read', record(21))).toBe(true)
    expect(a.can('read', record(99))).toBe(false)
  })

  it('teacher sees learners in assigned classes and marks only those classes', () => {
    const a = as('teacher', { id: 5, classIds: [3], taughtLearnerIds: [21] })
    expect(a.can('read', record(21))).toBe(true)
    expect(a.can('read', record(22))).toBe(false)
    expect(a.can('mark', subject('Attempt', { classId: 3 }))).toBe(true)
    expect(a.can('mark', subject('Attempt', { classId: 4 }))).toBe(false)
  })

  it('learner sees only own records', () => {
    const a = as('learner', { id: 21 })
    expect(a.can('read', record(21))).toBe(true)
    expect(a.can('read', record(22))).toBe(false)
  })

  it('learner awaiting guardian approval cannot take assessments', () => {
    expect(as('learner', { status: 'pending_guardian' }).can('take', 'Assessment')).toBe(false)
    expect(as('learner').can('take', 'Assessment')).toBe(true)
  })

  it('suspended users can do nothing, even admins', () => {
    expect(as('super_admin', { status: 'suspended' }).can('read', 'User')).toBe(false)
  })

  it('content editor cannot manage users, settings or payments', () => {
    const a = as('content_editor')
    expect(a.can('update', 'User')).toBe(false)
    expect(a.can('manage', 'Setting')).toBe(false)
    expect(a.can('read', 'Payment')).toBe(false)
    expect(a.can('create', 'Content')).toBe(true)
  })

  it('super admin can do everything', () => {
    expect(as('super_admin').can('manage', 'all')).toBe(true)
  })
})

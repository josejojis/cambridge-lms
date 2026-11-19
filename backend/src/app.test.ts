import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app'
import { createDb } from './lib/db'
import { hashPassword, verifyPassword } from './lib/password'

// Runs against the seeded dev database (run `npm run db:seed` first).
const db = createDb()
let app: Awaited<ReturnType<typeof buildApp>>

beforeAll(async () => { app = await buildApp(db) })
afterAll(async () => { await app.close(); await db.$disconnect() })

describe('API', () => {
  it('GET /api/v1/health reports the database is reachable', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('ok')
  })

  it('GET /api/v1/catalogue returns both curricula with their own terminology', async () => {
    const { data } = (await app.inject({ method: 'GET', url: '/api/v1/catalogue' })).json()
    const codes = data.map((c: { code: string }) => c.code)
    expect(codes).toEqual(['cambridge', 'cbc'])
    const cbc = data.find((c: { code: string }) => c.code === 'cbc')
    expect(cbc.labels.unit).toBe('Strand')
    expect(cbc.levels.map((l: { name: string }) => l.name)).toContain('Junior School')
  })

  it('GET /api/v1/plans exposes only public plan fields', async () => {
    const { data } = (await app.inject({ method: 'GET', url: '/api/v1/plans' })).json()
    expect(data.length).toBeGreaterThan(0)
    expect(data[0]).not.toHaveProperty('id')
    expect(data[0]).not.toHaveProperty('isActive')
  })

  it('unknown routes return 404', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/nope' })).statusCode).toBe(404)
  })
})

describe('seeded data integrity', () => {
  it('stores only hashed passwords', async () => {
    const u = await db.user.findUniqueOrThrow({ where: { username: 'admin' } })
    expect(u.passwordHash.startsWith('scrypt$')).toBe(true)
  })

  it('marks every seeded account as test data', async () => {
    expect(await db.user.count({ where: { isTestData: false } })).toBe(0)
  })

  it('never marks a payment succeeded without verification', async () => {
    expect(await db.payment.count({ where: { status: 'succeeded', verifiedAt: null } })).toBe(0)
  })

  it('keeps the under-18 learner without parent approval limited', async () => {
    const zuri = await db.user.findUniqueOrThrow({ where: { username: 'zuri' }, include: { parentLinks: true } })
    expect(zuri.status).toBe('pending_guardian')
    expect(zuri.parentLinks.every((l) => l.status === 'pending')).toBe(true)
  })
})

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const h = await hashPassword('correct horse')
    expect(await verifyPassword('correct horse', h)).toBe(true)
    expect(await verifyPassword('wrong', h)).toBe(false)
  })
})

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from './app'
import { createDb } from './lib/db'
import { hashPassword, verifyPassword } from './lib/password'

// Runs against the seeded database (npm run db:seed first). CI runs it on SQLite and PostgreSQL.
const db = createDb()
let app: Awaited<ReturnType<typeof buildApp>>
const ORIGIN = process.env.APP_ORIGIN ?? 'http://localhost:5000'
const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'ChangeMe!2026'

beforeAll(async () => { app = await buildApp(db) })
afterAll(async () => { await app.close(); await db.$disconnect() })

/** Signs in through Better Auth and returns the session cookie header. */
async function login(username: string) {
  const res = await app.inject({ method: 'POST', url: '/api/auth/sign-in/username', headers: { origin: ORIGIN, 'content-type': 'application/json' }, payload: { username, password: PASSWORD } })
  expect(res.statusCode, res.body).toBe(200)
  return [res.headers['set-cookie']].flat().filter(Boolean).map((c) => String(c).split(';')[0]).join('; ')
}
const get = (url: string, cookie?: string) => app.inject({ method: 'GET', url, headers: cookie ? { cookie } : {} })

describe('public API', () => {
  it('GET /api/v1/health reports the database is reachable', async () => {
    const res = await get('/api/v1/health')
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('ok')
  })

  it('GET /api/v1/catalogue returns both curricula with their own terminology and every stage', async () => {
    const { data } = (await get('/api/v1/catalogue')).json()
    expect(data.map((c: { code: string }) => c.code)).toEqual(['cambridge', 'cbc'])
    const cbc = data.find((c: { code: string }) => c.code === 'cbc')
    expect(cbc.labels.unit).toBe('Strand')
    expect(cbc.levels.map((l: { name: string }) => l.name)).toEqual(['Pre-Primary', 'Lower Primary', 'Upper Primary', 'Junior School', 'Senior School'])
  })

  it('GET /api/v1/plans exposes only public plan fields', async () => {
    const { data } = (await get('/api/v1/plans')).json()
    expect(data.length).toBeGreaterThan(0)
    expect(data[0]).not.toHaveProperty('id')
    expect(data[0]).not.toHaveProperty('isActive')
  })

  it('validation errors are reported per field', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/register/parent', headers: { origin: ORIGIN }, payload: { name: 'x', email: 'bad', password: 'short', acceptTerms: true } })
    expect(res.statusCode).toBe(400)
    expect(res.json().issues.map((i: { path: string }) => i.path)).toEqual(expect.arrayContaining(['email', 'password']))
  })
})

describe('authentication and authorization', () => {
  it('rejects wrong passwords', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/sign-in/username', headers: { origin: ORIGIN }, payload: { username: 'amani', password: 'wrong-password' } })
    expect(res.statusCode).toBe(401)
  })

  it('requires a session for /me', async () => {
    expect((await get('/api/v1/me')).statusCode).toBe(401)
  })

  it('learner signs in by username and gets their roles and home', async () => {
    const me = (await get('/api/v1/me', await login('amani'))).json()
    expect(me.roles).toEqual(['learner'])
    expect(me.home).toBe('/learn')
    expect(me.email).toBeNull() // placeholder address is never exposed
  })

  it('parent sees only their own linked children', async () => {
    const { data } = (await get('/api/v1/parent/children', await login('parent.grace'))).json()
    expect(data.map((c: { name: string }) => c.name).sort()).toEqual(['Demo Learner Amani Wanjiru', 'Demo Learner Neema Wanjiru'])
  })

  it('blocks cross-site state-changing requests (CSRF)', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/parent/link-requests/1', headers: { origin: 'https://evil.example', cookie: await login('parent.peter') }, payload: { decision: 'approve' } })
    expect(res.statusCode).toBe(403)
  })

  it('learner awaiting parent approval cannot start an assessment', async () => {
    const zuri = await login('zuri')
    const assessment = await db.assessment.findFirstOrThrow({ where: { status: 'published' } })
    const res = await app.inject({ method: 'POST', url: `/api/v1/assessments/${assessment.id}/attempts`, headers: { origin: ORIGIN, cookie: zuri } })
    expect(res.statusCode).toBe(403)
  })

  it('parent approval activates the learner and records guardian consent', async () => {
    const peter = await login('parent.peter')
    const zuri = await db.user.findUniqueOrThrow({ where: { username: 'zuri' } })
    const res = await app.inject({ method: 'POST', url: `/api/v1/parent/link-requests/${zuri.id}`, headers: { origin: ORIGIN, cookie: peter }, payload: { decision: 'approve' } })
    expect(res.json().status).toBe('active')
    expect((await db.user.findUniqueOrThrow({ where: { id: zuri.id } })).status).toBe('active')
    expect(await db.consent.count({ where: { subjectUserId: zuri.id, type: 'guardian_data_processing' } })).toBe(1)
    // restore seed state for repeatable runs
    await db.user.update({ where: { id: zuri.id }, data: { status: 'pending_guardian' } })
    await db.parentLearnerLink.updateMany({ where: { learnerId: zuri.id }, data: { status: 'pending', verifiedAt: null } })
    await db.consent.deleteMany({ where: { subjectUserId: zuri.id } })
  })
})

describe('examination engine over HTTP', () => {
  it('start → autosave → submit is marked once; answer keys hidden until release', async () => {
    const kevin = await login('kevin')
    const quiz = await db.assessment.findFirstOrThrow({ where: { title: { startsWith: 'Numbers quick quiz' } } })
    const start = await app.inject({ method: 'POST', url: `/api/v1/assessments/${quiz.id}/attempts`, headers: { origin: ORIGIN, cookie: kevin } })
    expect(start.statusCode, start.body).toBe(201)
    const id = start.json().id

    const view = (await get(`/api/v1/attempts/${id}`, kevin)).json()
    expect(JSON.stringify(view)).not.toContain('isCorrect')
    const mcq = view.questions.find((q: { type: string }) => q.type === 'mcq')
    const save = await app.inject({ method: 'PUT', url: `/api/v1/attempts/${id}/answers`, headers: { origin: ORIGIN, cookie: kevin },
      payload: { answers: [{ questionId: mcq.id, response: { optionId: mcq.options[2].id }, clientSavedAt: new Date().toISOString() }] } })
    expect(save.statusCode, save.body).toBe(200)

    const [s1, s2] = await Promise.all([
      app.inject({ method: 'POST', url: `/api/v1/attempts/${id}/submit`, headers: { origin: ORIGIN, cookie: kevin } }),
      app.inject({ method: 'POST', url: `/api/v1/attempts/${id}/submit`, headers: { origin: ORIGIN, cookie: kevin } }),
    ])
    expect([s1.json().alreadySubmitted, s2.json().alreadySubmitted].sort()).toEqual([false, true])
    const at = await db.assessmentAttempt.findUniqueOrThrow({ where: { publicId: id }, include: { result: true } })
    expect(at.status).toBe('released')
    expect(at.result).not.toBeNull()

    const late = await app.inject({ method: 'PUT', url: `/api/v1/attempts/${id}/answers`, headers: { origin: ORIGIN, cookie: kevin },
      payload: { answers: [{ questionId: mcq.id, response: { optionId: mcq.options[0].id }, clientSavedAt: new Date().toISOString() }] } })
    expect(late.statusCode).toBe(409)
    await db.assessmentAttempt.delete({ where: { id: at.id } }) // keep seed state
  })

  it('a learner cannot read another learner’s attempt', async () => {
    const other = await db.assessmentAttempt.findFirstOrThrow({ where: { learner: { username: 'brian' } } })
    expect((await get(`/api/v1/attempts/${other.publicId}`, await login('aisha'))).statusCode).toBe(404)
  })
})

describe('seeded data integrity', () => {
  it('stores only hashed passwords', async () => {
    const acc = await db.account.findFirstOrThrow({ where: { providerId: 'credential' } })
    expect(acc.password?.startsWith('scrypt$')).toBe(true)
  })
  it('marks every seeded account as test data', async () => {
    expect(await db.user.count({ where: { isTestData: false } })).toBe(0)
  })
  it('never marks a payment succeeded without verification', async () => {
    expect(await db.payment.count({ where: { status: 'succeeded', verifiedAt: null } })).toBe(0)
  })
})

describe('password hashing', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const h = await hashPassword('correct horse')
    expect(await verifyPassword('correct horse', h)).toBe(true)
    expect(await verifyPassword('wrong', h)).toBe(false)
  })
})

import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDb } from '../lib/db'
import { enqueue, QUEUES, runDueJobs, type Handlers } from '.'

const db = createDb()
afterAll(() => db.$disconnect())
beforeEach(async () => { await db.job.deleteMany() })

const handlers = (over: Partial<Handlers> = {}): Handlers => ({
  [QUEUES.email]: vi.fn(async () => {}), [QUEUES.notify]: vi.fn(async () => {}), [QUEUES.attemptMarked]: vi.fn(async () => {}), ...over,
})

describe('job queue', () => {
  it('runs due jobs once and marks them done', async () => {
    const h = handlers()
    await enqueue(QUEUES.notify, { userId: 1, type: 't', data: {} }, { db })
    expect(await runDueJobs(db, h)).toBe(1)
    expect(await runDueJobs(db, h)).toBe(0)
    expect(h[QUEUES.notify]).toHaveBeenCalledOnce()
    expect((await db.job.findFirstOrThrow()).status).toBe('done')
  })

  it('does not run delayed jobs early', async () => {
    await enqueue(QUEUES.notify, { userId: 1, type: 't', data: {} }, { db, delayMs: 60_000 })
    expect(await runDueJobs(db, handlers())).toBe(0)
  })

  it('retries failures with backoff, then marks failed after max attempts', async () => {
    const boom = handlers({ [QUEUES.email]: async () => { throw new Error('smtp down') } })
    const job = await enqueue(QUEUES.email, { to: 'x@y.test', subject: 's', text: 't' }, { db })
    await runDueJobs(db, boom)
    let row = await db.job.findUniqueOrThrow({ where: { id: job.id } })
    expect(row.status).toBe('queued')
    expect(row.lastError).toBe('smtp down')
    expect(row.runAt.getTime()).toBeGreaterThan(Date.now())

    await db.job.update({ where: { id: job.id }, data: { attempts: 4, runAt: new Date() } })
    await runDueJobs(db, boom)
    row = await db.job.findUniqueOrThrow({ where: { id: job.id } })
    expect(row.status).toBe('failed')
  })

  it('two workers never run the same job', async () => {
    const h = handlers()
    await enqueue(QUEUES.notify, { userId: 1, type: 't', data: {} }, { db })
    const [a, b] = await Promise.all([runDueJobs(db, h), runDueJobs(db, h)])
    expect(a + b).toBe(1)
    expect(h[QUEUES.notify]).toHaveBeenCalledOnce()
  })
})

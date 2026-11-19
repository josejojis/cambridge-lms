import type { Db } from '../lib/db'
import type { Mail } from '../lib/mailer'

/**
 * Database-backed job queue: works on SQLite (dev) and PostgreSQL (prod), with no extra service to run.
 * The API enqueues; `src/worker.ts` processes. Claiming is an atomic conditional update, so several
 * workers never run the same job. Failed jobs retry with exponential backoff.
 */
export const QUEUES = {
  email: 'email.send',
  attemptMarked: 'attempt.marked', // recompute topic performance + spaced repetition
  notify: 'notification.create',
} as const

export type JobData = {
  [QUEUES.email]: Mail
  [QUEUES.attemptMarked]: { attemptId: number }
  [QUEUES.notify]: { userId: number; type: string; data: Record<string, unknown> }
}
type QueueName = keyof JobData
export type Handlers = { [K in QueueName]: (data: JobData[K]) => Promise<void> }

let defaultDb: Db | null = null
/** Lazily bound so importing this module never opens a connection. */
async function getDb() { return (defaultDb ??= (await import('../lib/db')).db) }

export async function enqueue<K extends QueueName>(queue: K, data: JobData[K], opts: { delayMs?: number; db?: Db } = {}) {
  const db = opts.db ?? (await getDb())
  return db.job.create({ data: { queue, data: data as never, runAt: new Date(Date.now() + (opts.delayMs ?? 0)) } })
}

const backoffMs = (attempt: number) => Math.min(60 * 60_000, 2 ** attempt * 5_000)
const STALE_LOCK_MS = 5 * 60_000

/** Claims and runs up to `limit` due jobs. Returns how many ran. */
export async function runDueJobs(db: Db, handlers: Handlers, limit = 10): Promise<number> {
  // Recover jobs whose worker died mid-run
  await db.job.updateMany({ where: { status: 'running', lockedAt: { lt: new Date(Date.now() - STALE_LOCK_MS) } }, data: { status: 'queued', lockedAt: null } })

  const due = await db.job.findMany({ where: { status: 'queued', runAt: { lte: new Date() } }, orderBy: { runAt: 'asc' }, take: limit })
  let ran = 0
  for (const job of due) {
    const claim = await db.job.updateMany({ where: { id: job.id, status: 'queued' }, data: { status: 'running', lockedAt: new Date(), attempts: { increment: 1 } } })
    if (claim.count !== 1) continue // another worker took it
    ran++
    try {
      const handler = handlers[job.queue as QueueName] as ((d: unknown) => Promise<void>) | undefined
      if (!handler) throw new Error(`No handler for queue ${job.queue}`)
      await handler(job.data)
      await db.job.update({ where: { id: job.id }, data: { status: 'done', finishedAt: new Date(), lockedAt: null } })
    } catch (e) {
      const attempts = job.attempts + 1
      const failed = attempts >= job.maxAttempts
      await db.job.update({ where: { id: job.id }, data: {
        status: failed ? 'failed' : 'queued', lockedAt: null, lastError: String((e as Error).message ?? e).slice(0, 2000),
        runAt: failed ? job.runAt : new Date(Date.now() + backoffMs(attempts)), finishedAt: failed ? new Date() : null,
      } })
    }
  }
  return ran
}

/** Deletes finished jobs older than `days` (keeps failed ones for inspection). */
export const pruneJobs = (db: Db, days = 14) =>
  db.job.deleteMany({ where: { status: 'done', finishedAt: { lt: new Date(Date.now() - days * 86_400_000) } } })

import { offlineDb, type OutboxItem } from './offline-db'

/**
 * Answer outbox: every answer is written to the device first, then sent.
 * The server endpoint is an idempotent upsert, so replays are always safe, and the server's
 * deadline (not the device clock) decides whether a late answer still counts.
 */
type Send = (attemptId: string, answers: { questionId: number; response: unknown; clientSavedAt: string }[]) => Promise<Response>

const defaultSend: Send = (attemptId, answers) => fetch(`/api/v1/attempts/${attemptId}/answers`, {
  method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }),
})

let flushing: Promise<void> | null = null

export async function saveAnswerLocally(attemptId: string, questionId: number, response: unknown) {
  // Keep only the latest response per question
  await offlineDb.transaction('rw', offlineDb.outbox, async () => {
    await offlineDb.outbox.where({ attemptId, questionId }).delete()
    await offlineDb.outbox.add({ attemptId, questionId, response, clientSavedAt: new Date().toISOString(), tries: 0 })
  })
  void flushOutbox()
}

export async function pendingCount(attemptId?: string) {
  return attemptId ? offlineDb.outbox.where({ attemptId }).count() : offlineDb.outbox.count()
}

export function flushOutbox(send: Send = defaultSend): Promise<void> {
  if (flushing) return flushing
  flushing = (async () => {
    try {
      const items = await offlineDb.outbox.toArray()
      const byAttempt = new Map<string, OutboxItem[]>()
      for (const it of items) byAttempt.set(it.attemptId, [...(byAttempt.get(it.attemptId) ?? []), it])
      for (const [attemptId, batch] of byAttempt) {
        let res: Response
        try {
          res = await send(attemptId, batch.map(({ questionId, response, clientSavedAt }) => ({ questionId, response, clientSavedAt })))
        } catch {
          return // offline: keep everything, retry on reconnect
        }
        const ids = batch.map((b) => b.id!)
        if (res.ok || res.status === 409 || res.status === 404 || res.status === 400) {
          // Saved, or permanently rejected (already submitted / time up / invalid): stop retrying
          await offlineDb.outbox.bulkDelete(ids)
        } else {
          await offlineDb.outbox.where('id').anyOf(ids).modify((i) => { i.tries += 1 })
        }
      }
    } finally {
      flushing = null
    }
  })()
  return flushing
}

/** Flush when connectivity returns, when the tab regains focus, and every 15 seconds. */
export function startOutboxSync() {
  const run = () => { if (navigator.onLine) void flushOutbox() }
  window.addEventListener('online', run)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') run() })
  const timer = window.setInterval(run, 15_000)
  run()
  return () => { window.removeEventListener('online', run); window.clearInterval(timer) }
}

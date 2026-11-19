import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { offlineDb } from './offline-db'
import { flushOutbox, pendingCount, saveAnswerLocally } from './outbox'

const ok = () => Promise.resolve(new Response('{}', { status: 200 }))

describe('answer outbox (offline autosave)', () => {
  beforeEach(async () => { await offlineDb.outbox.clear() })

  it('keeps answers on the device while offline and sends them when back online', async () => {
    const offline = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    await offlineDb.outbox.add({ attemptId: 'a1', questionId: 1, response: { optionId: 2 }, clientSavedAt: new Date().toISOString(), tries: 0 })
    await flushOutbox(offline)
    expect(await pendingCount('a1')).toBe(1)

    const online = vi.fn(ok)
    await flushOutbox(online)
    expect(online).toHaveBeenCalledOnce()
    expect(await pendingCount('a1')).toBe(0)
  })

  it('stores only the latest answer per question', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('offline'))))
    await saveAnswerLocally('a2', 7, { text: 'first' })
    await saveAnswerLocally('a2', 7, { text: 'second' })
    const items = await offlineDb.outbox.where({ attemptId: 'a2' }).toArray()
    expect(items).toHaveLength(1)
    expect(items[0].response).toEqual({ text: 'second' })
    vi.unstubAllGlobals()
  })

  it('drops answers the server permanently rejects (attempt already submitted)', async () => {
    await offlineDb.outbox.add({ attemptId: 'a3', questionId: 1, response: { value: true }, clientSavedAt: new Date().toISOString(), tries: 0 })
    await flushOutbox(() => Promise.resolve(new Response('{}', { status: 409 })))
    expect(await pendingCount('a3')).toBe(0)
  })

  it('retries later on server errors', async () => {
    await offlineDb.outbox.add({ attemptId: 'a4', questionId: 1, response: { value: true }, clientSavedAt: new Date().toISOString(), tries: 0 })
    await flushOutbox(() => Promise.resolve(new Response('{}', { status: 503 })))
    const [item] = await offlineDb.outbox.where({ attemptId: 'a4' }).toArray()
    expect(item.tries).toBe(1)
  })
})

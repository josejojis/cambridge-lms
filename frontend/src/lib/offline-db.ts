import Dexie, { type EntityTable } from 'dexie'

/**
 * On-device storage (IndexedDB) for offline-first learning.
 *  - lessons: lessons the learner chose to download, readable without a connection
 *  - outbox:  exam/practice answers saved while offline (or before the server confirmed),
 *             replayed in order when the connection returns
 * Cleared on sign-out so a shared family device doesn't keep another child's data.
 */
export interface CachedLesson { id: number; courseSlug: string; title: string; sections: { title: string; type: string; bodyHtml: string }[]; savedAt: number }
export interface OutboxItem { id?: number; attemptId: string; questionId: number; response: unknown; clientSavedAt: string; tries: number }

class OfflineDb extends Dexie {
  lessons!: EntityTable<CachedLesson, 'id'>
  outbox!: EntityTable<OutboxItem, 'id'>
  constructor() {
    super('elite-revision')
    this.version(1).stores({ lessons: 'id, courseSlug, savedAt', outbox: '++id, attemptId, [attemptId+questionId]' })
  }
}

export const offlineDb = new OfflineDb()

export async function clearOfflineData() {
  await Promise.all([offlineDb.lessons.clear(), offlineDb.outbox.clear()])
}

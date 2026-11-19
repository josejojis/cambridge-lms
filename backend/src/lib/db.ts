import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client'

export type Db = PrismaClient
export const isPostgresUrl = (url = process.env.DATABASE_URL ?? '') => /^postgres(ql)?:\/\//.test(url)

// Load only the driver this environment needs (the SQLite driver isn't installed in production).
const { PrismaPg } = isPostgresUrl() ? await import('@prisma/adapter-pg') : { PrismaPg: null }
const { PrismaBetterSqlite3 } = isPostgresUrl() ? { PrismaBetterSqlite3: null } : await import('@prisma/adapter-better-sqlite3')

export function createDb(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL is not set')
  const adapter = isPostgresUrl(url)
    ? new PrismaPg!({ connectionString: url, max: Number(process.env.DB_POOL_MAX ?? 10) })
    : new PrismaBetterSqlite3!({ url })
  return new PrismaClient({ adapter })
}

export const db = createDb()

type Tx = Parameters<Parameters<Db['$transaction']>[0]>[0]

/**
 * Runs `fn` in a transaction as the acting user.
 * On PostgreSQL (production) it switches to the restricted `elite_app` role and sets `app.user_id`,
 * so row-level security applies underneath the API's own policy checks (defence in depth).
 * On SQLite (development) there is no RLS; only the API's CASL policies apply.
 */
export async function asUser<T>(client: Db, actor: { userId: number; bypass?: boolean }, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return client.$transaction(async (tx) => {
    if (isPostgresUrl()) {
      await tx.$executeRawUnsafe('SET LOCAL ROLE elite_app')
      await tx.$executeRaw`SELECT set_config('app.user_id', ${String(actor.userId)}, true), set_config('app.bypass_rls', ${actor.bypass ? 'on' : 'off'}, true)`
    }
    return fn(tx)
  })
}

import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../generated/prisma/client'

export function createDb(url = process.env.DATABASE_URL ?? 'file:./dev.db') {
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) })
}

export const db = createDb()

import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// SQLite URL (file:) → dev schema + migrations; PostgreSQL URL → generated postgres schema + migrations.
const isPostgres = /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL ?? '')
const dir = isPostgres ? 'prisma/postgres' : 'prisma'

export default defineConfig({
  schema: `${dir}/schema.prisma`,
  migrations: { path: `${dir}/migrations`, seed: 'tsx prisma/seed.ts' },
  datasource: { url: env('DATABASE_URL') },
})

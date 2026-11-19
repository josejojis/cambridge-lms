// Creates the PostgreSQL migration for the latest schema change WITHOUT needing a Postgres server:
// diffs a snapshot of the last migrated postgres schema against the freshly generated one.
//   npm run db:migrate:postgres -- <name>
import { execFileSync, execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'

const name = (process.argv[2] ?? 'change').replace(/[^a-z0-9_]/gi, '_').toLowerCase()
const migrations = new URL('../prisma/postgres/migrations/', import.meta.url)
const snapshot = 'prisma/postgres/.last-migrated.prisma'
mkdirSync(migrations, { recursive: true })
execFileSync('node', ['scripts/sync-schemas.mjs'], { stdio: 'inherit' })

const from = existsSync(snapshot) ? `--from-schema ${snapshot}` : '--from-empty'
const sql = execSync(`npx prisma migrate diff ${from} --to-schema prisma/postgres/schema.prisma --script`,
  { encoding: 'utf8', env: { ...process.env, DATABASE_URL: 'postgresql://unused@localhost/unused' } })
if (!sql.trim() || /empty migration/i.test(sql)) { console.log('No PostgreSQL changes.'); process.exit(0) }

const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14)
const folder = new URL(`${stamp}_${name}/`, migrations)
mkdirSync(folder)
writeFileSync(new URL('migration.sql', folder), sql)
writeFileSync(new URL('migration_lock.toml', migrations), 'provider = "postgresql"\n')
copyFileSync('prisma/postgres/schema.prisma', snapshot)
console.log(`created prisma/postgres/migrations/${stamp}_${name}`)

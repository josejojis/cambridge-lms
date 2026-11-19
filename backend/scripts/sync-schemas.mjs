// Generates prisma/postgres/schema.prisma from the canonical prisma/schema.prisma (provider swapped).
// Run automatically by `npm run db:generate`; CI fails if the committed copy is stale (--check).
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'

const src = new URL('../prisma/schema.prisma', import.meta.url)
const out = new URL('../prisma/postgres/schema.prisma', import.meta.url)
const banner = '// GENERATED from prisma/schema.prisma by scripts/sync-schemas.mjs. Do not edit.\n'

const schema = readFileSync(src, 'utf8')
const swapped = schema
  .replace(/datasource db \{\s*provider = "sqlite"\s*\}/, 'datasource db {\n  provider = "postgresql"\n}')
  .replace('output   = "../src/generated/prisma"', 'output   = "../../src/generated/prisma"')
if (swapped === schema) throw new Error('Could not find the sqlite datasource block in schema.prisma')
const next = banner + swapped

if (process.argv.includes('--check')) {
  const current = existsSync(out) ? readFileSync(out, 'utf8') : ''
  if (current !== next) { console.error('prisma/postgres/schema.prisma is stale: run npm run db:generate'); process.exit(1) }
  console.log('postgres schema is up to date')
} else {
  mkdirSync(new URL('../prisma/postgres/', import.meta.url), { recursive: true })
  writeFileSync(out, next)
  console.log('wrote prisma/postgres/schema.prisma')
}

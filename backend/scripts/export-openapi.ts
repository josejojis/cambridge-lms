// Writes backend/openapi.json; the frontend generates its typed client from it (npm run api:types).
import { writeFileSync } from 'node:fs'
import { buildApp } from '../src/app'
import { db } from '../src/lib/db'

const app = await buildApp(db)
await app.ready()
writeFileSync(new URL('../openapi.json', import.meta.url), JSON.stringify(app.swagger(), null, 2))
await app.close(); await db.$disconnect()
console.log('openapi.json written')

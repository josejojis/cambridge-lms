import 'dotenv/config'
import { buildApp } from './app'
import { db } from './lib/db'

const port = Number(process.env.PORT ?? 4000)
const app = await buildApp(db, { logger: true })

for (const sig of ['SIGINT', 'SIGTERM'] as const)
  process.on(sig, async () => { await app.close(); await db.$disconnect(); process.exit(0) })

await app.listen({ port, host: '127.0.0.1' })

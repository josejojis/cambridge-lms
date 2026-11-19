import { env } from './lib/env'
import { initMonitoring } from './lib/monitoring'
import { buildApp } from './app'
import { db } from './lib/db'

initMonitoring('api')
const app = await buildApp(db, { logger: true })

for (const sig of ['SIGINT', 'SIGTERM'] as const)
  process.on(sig, async () => { await app.close(); await db.$disconnect(); process.exit(0) })

// 0.0.0.0 in containers/PaaS (behind the proxy), loopback in local dev
await app.listen({ port: env.PORT, host: env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1' })

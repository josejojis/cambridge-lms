import * as Sentry from '@sentry/node'
import { env } from './env'

/**
 * Error monitoring + tracing (Sentry ships OpenTelemetry-based instrumentation).
 * No-op unless SENTRY_DSN is set. PII is never sent: no IPs, cookies or request bodies.
 */
export function initMonitoring(service: 'api' | 'worker') {
  if (!env.SENTRY_DSN) return
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    serverName: `elite-revision-${service}`,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1,
    beforeSend(event) {
      if (event.request) { delete event.request.cookies; delete event.request.data; delete event.request.headers }
      if (event.user) event.user = { id: event.user.id }
      return event
    },
  })
}

export const captureError = (e: unknown) => { if (env.SENTRY_DSN) Sentry.captureException(e) }

import './lib/env'
import { db } from './lib/db'
import { sendMail } from './lib/mailer'
import { pruneJobs, QUEUES, runDueJobs, type Handlers } from './jobs'
import { submitAttempt } from './modules/assessment/attempts'
import { recordAttemptPerformance } from './modules/learning/srs'
import { initMonitoring, captureError } from './lib/monitoring'

initMonitoring('worker')

const handlers: Handlers = {
  [QUEUES.email]: async (m) => { await sendMail(m) },
  [QUEUES.notify]: async (n) => { await db.notification.create({ data: { userId: n.userId, type: n.type, data: n.data as never } }) },
  [QUEUES.attemptMarked]: async ({ attemptId }) => { await recordAttemptPerformance(db, attemptId) },
}

/** Submit attempts whose time ran out (tab closed, connection lost…). Exactly-once via submitAttempt. */
async function autoSubmitExpired() {
  const due = await db.assessmentAttempt.findMany({ where: { status: 'in_progress', deadlineAt: { lt: new Date(Date.now() - 30_000) } }, select: { publicId: true } })
  for (const a of due) {
    const r = await submitAttempt(db, a.publicId, { reason: 'timeout' })
    if (!r.alreadySubmitted) await recordAttemptPerformance(db, r.attemptId)
  }
}

/** Expire lapsed subscriptions after the grace period and tell the payer. Idempotent. */
async function expireSubscriptions() {
  const grace = await db.systemSetting.findUnique({ where: { key: 'billing.grace_period_days' } })
  const cutoff = new Date(Date.now() - Number(grace?.value ?? 3) * 86_400_000)
  const lapsed = await db.subscription.findMany({ where: { status: { in: ['active', 'past_due', 'trialing'] }, currentPeriodEnd: { lt: cutoff } }, include: { plan: true } })
  for (const s of lapsed) {
    const done = await db.subscription.updateMany({ where: { id: s.id, status: s.status }, data: { status: 'expired' } })
    if (done.count) await db.notification.create({ data: { userId: s.payerId, type: 'subscription_expired', data: { message: `Your ${s.plan.name} subscription has expired.` } } })
  }
}

const every = (ms: number, fn: () => Promise<unknown>) => {
  const tick = () => fn().catch((e) => { console.error('[worker]', e); captureError(e) })
  void tick()
  return setInterval(tick, ms)
}

let stopping = false
async function loop() {
  while (!stopping) {
    try { if ((await runDueJobs(db, handlers)) === 0) await new Promise((r) => setTimeout(r, 1000)) }
    catch (e) { console.error('[worker]', e); captureError(e); await new Promise((r) => setTimeout(r, 5000)) }
  }
}

const timers = [every(60_000, autoSubmitExpired), every(15 * 60_000, expireSubscriptions), every(24 * 3600_000, () => pruneJobs(db))]
console.info('[worker] processing jobs')
void loop()

for (const sig of ['SIGINT', 'SIGTERM'] as const)
  process.on(sig, async () => { stopping = true; timers.forEach(clearInterval); await db.$disconnect(); process.exit(0) })

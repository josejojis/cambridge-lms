import { markAnswer, totalAttempt, type QuestionType, type SaveAnswers } from '@elite/shared'
import type { Db } from '../../lib/db'
import type { Principal } from '../identity/users'

const GRACE_MS = 30_000 // network grace after the deadline (offline answers saved before it still count)
const httpError = (statusCode: number, message: string) => Object.assign(new Error(message), { statusCode })

function shuffle<T>(arr: T[]) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export async function startAttempt(db: Db, learner: Principal, assessmentId: number) {
  if (learner.status !== 'active') throw httpError(403, 'Your account needs parent or guardian approval before you can take assessments.')
  const a = await db.assessment.findUnique({ where: { id: assessmentId }, include: { questions: { orderBy: { sortOrder: 'asc' } } } })
  if (!a || a.status !== 'published') throw httpError(404, 'Assessment not found')
  const now = new Date()
  if (a.opensAt && now < a.opensAt) throw httpError(403, 'This assessment is not open yet.')
  if (a.closesAt && now > a.closesAt) throw httpError(403, 'This assessment has closed.')

  // Resume an in-progress attempt instead of creating a second one (interrupted sessions)
  const open = await db.assessmentAttempt.findFirst({ where: { assessmentId, learnerId: learner.id, status: 'in_progress' } })
  if (open) return open

  const used = await db.assessmentAttempt.count({ where: { assessmentId, learnerId: learner.id } })
  if (a.maxAttempts && used >= a.maxAttempts) throw httpError(403, 'You have used all your attempts for this assessment.')

  let ids = a.questions.map((q) => q.questionId)
  if (a.randomPickCount && a.randomPickCount < ids.length) ids = shuffle(ids).slice(0, a.randomPickCount)
  else if (a.shuffleQuestions) ids = shuffle(ids)

  let deadline = a.durationMinutes ? new Date(now.getTime() + a.durationMinutes * 60_000) : null
  if (deadline && a.closesAt && a.closesAt < deadline) deadline = a.closesAt

  try {
    return await db.assessmentAttempt.create({
      data: { assessmentId, learnerId: learner.id, attemptNo: used + 1, deadlineAt: deadline, questionOrder: ids },
    })
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') // concurrent double-click → return the attempt the other request created
      return db.assessmentAttempt.findFirstOrThrow({ where: { assessmentId, learnerId: learner.id, status: 'in_progress' } })
    throw e
  }
}

/** Learner view of an attempt. Correct answers and explanations appear only after release. */
export async function getAttemptForLearner(db: Db, learnerId: number, publicId: string) {
  const at = await db.assessmentAttempt.findUnique({
    where: { publicId },
    include: {
      assessment: { select: { title: true, instructions: true, type: true, durationMinutes: true } },
      answers: true, result: true,
    },
  })
  if (!at || at.learnerId !== learnerId) throw httpError(404, 'Attempt not found')
  const order = (at.questionOrder as number[]) ?? []
  const released = at.status === 'released'
  const questions = await db.question.findMany({ where: { id: { in: order } }, include: { options: { orderBy: { sortOrder: 'asc' } } } })
  const byId = new Map(questions.map((q) => [q.id, q]))
  return {
    id: at.publicId, status: at.status, assessment: at.assessment, startedAt: at.startedAt, deadlineAt: at.deadlineAt, serverNow: new Date(),
    questions: order.map((id) => byId.get(id)!).filter(Boolean).map((q) => {
      const ans = at.answers.find((x) => x.questionId === q.id)
      const key = q.answerKey as { pairs?: Record<string, string> } | null
      return {
        id: q.id, type: q.type, stemHtml: q.stemHtml, instructions: q.instructions, marks: q.marks,
        options: q.options.map((o) => ({ id: o.id, labelHtml: o.labelHtml, ...(released ? { isCorrect: o.isCorrect } : {}) })),
        // Matching: learners need both columns; right-hand side is shuffled so position leaks nothing.
        matching: q.type === 'matching' && key?.pairs ? { left: Object.keys(key.pairs), right: shuffle(Object.values(key.pairs)) } : undefined,
        response: ans?.response ?? null,
        ...(released ? { score: ans?.finalScore, feedback: ans?.feedback, explanationHtml: q.explanationHtml } : {}),
      }
    }),
    result: released && at.result ? { score: at.result.score, maxScore: at.result.maxScore, percentage: at.result.percentage, passed: at.result.passed } : null,
  }
}

/** Idempotent autosave: safe to retry, and replayed by the offline outbox after reconnecting. */
export async function saveAnswers(db: Db, learnerId: number, publicId: string, body: SaveAnswers) {
  const at = await db.assessmentAttempt.findUnique({ where: { publicId } })
  if (!at || at.learnerId !== learnerId) throw httpError(404, 'Attempt not found')
  if (at.status !== 'in_progress') throw httpError(409, 'This attempt has already been submitted.')
  if (at.deadlineAt && Date.now() > at.deadlineAt.getTime() + GRACE_MS) throw httpError(409, 'Time is up for this attempt.')
  const allowed = new Set((at.questionOrder as number[]) ?? [])
  const bad = body.answers.find((a) => !allowed.has(a.questionId))
  if (bad) throw httpError(400, `Question ${bad.questionId} is not part of this attempt.`)
  await db.$transaction(body.answers.map((a) => db.learnerAnswer.upsert({
    where: { attemptId_questionId: { attemptId: at.id, questionId: a.questionId } },
    update: { response: a.response },
    create: { attemptId: at.id, questionId: a.questionId, response: a.response },
  })))
  return { saved: body.answers.length, serverNow: new Date() }
}

/**
 * Submits and auto-marks. Exactly-once: the status flip `in_progress → submitted` is a conditional
 * update, so concurrent or repeated submissions (double taps, offline replays, the auto-submit job) are no-ops.
 */
export async function submitAttempt(db: Db, publicId: string, opts: { learnerId?: number; reason: 'learner' | 'timeout' }) {
  const result = await db.$transaction(async (tx) => {
    const flipped = await tx.assessmentAttempt.updateMany({
      where: { publicId, status: 'in_progress', ...(opts.learnerId ? { learnerId: opts.learnerId } : {}) },
      data: { status: 'submitted', submittedAt: new Date() },
    })
    const at = await tx.assessmentAttempt.findUnique({ where: { publicId }, include: { assessment: true, answers: true } })
    if (!at || (opts.learnerId && at.learnerId !== opts.learnerId)) throw httpError(404, 'Attempt not found')
    if (flipped.count === 0) return { attemptId: at.id, alreadySubmitted: true, status: at.status }

    const order = (at.questionOrder as number[]) ?? []
    const questions = await tx.question.findMany({ where: { id: { in: order } }, include: { options: true, assessments: { where: { assessmentId: at.assessmentId } } } })
    const items: { score: number | null; marks: number }[] = []
    for (const q of questions) {
      const marks = q.assessments[0]?.marksOverride ?? q.marks
      const ans = at.answers.find((a) => a.questionId === q.id)
      const out = markAnswer({ type: q.type as QuestionType, marks, options: q.options, answerKey: q.answerKey }, (ans?.response ?? null) as never)
      items.push({ score: out.score, marks })
      await tx.learnerAnswer.upsert({
        where: { attemptId_questionId: { attemptId: at.id, questionId: q.id } },
        update: { autoScore: out.score, finalScore: out.requiresManual ? null : out.score },
        create: { attemptId: at.id, questionId: q.id, autoScore: out.score, finalScore: out.requiresManual ? null : out.score },
      })
    }
    const t = totalAttempt(items, at.assessment.passMarkPct)
    if (t.pendingManual) {
      await tx.assessmentAttempt.update({ where: { id: at.id }, data: { status: 'marking' } })
      return { attemptId: at.id, alreadySubmitted: false, status: 'marking' as const }
    }
    const release = at.assessment.resultsRelease === 'immediate'
    await tx.assessmentResult.create({ data: {
      attemptId: at.id, score: t.score, maxScore: t.maxScore, percentage: t.percentage, passed: t.passed, releasedAt: release ? new Date() : null,
    } })
    const status = release ? 'released' as const : 'marked' as const
    await tx.assessmentAttempt.update({ where: { id: at.id }, data: { status } })
    return { attemptId: at.id, alreadySubmitted: false, status }
  })
  return result
}

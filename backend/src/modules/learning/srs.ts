import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs'
import type { Db } from '../../lib/db'

/**
 * Spaced repetition (FSRS) per learner × topic. Each assessment result on a topic counts as a
 * "review"; the scheduler decides when the topic should come back for revision.
 */
const scheduler = fsrs({ enable_fuzz: true, request_retention: 0.9 })

export const ratingFromPct = (pct: number): Grade =>
  pct < 50 ? Rating.Again : pct < 70 ? Rating.Hard : pct < 90 ? Rating.Good : Rating.Easy

export const ratingFromLabel = (r: 'again' | 'hard' | 'good' | 'easy'): Grade =>
  ({ again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy })[r]

const toCard = (row: { due: Date; stability: number; difficulty: number; scheduledDays: number; learningSteps: number; reps: number; lapses: number; state: number; lastReview: Date | null }): Card => ({
  due: row.due, stability: row.stability, difficulty: row.difficulty, scheduled_days: row.scheduledDays,
  learning_steps: row.learningSteps, reps: row.reps, lapses: row.lapses, state: row.state as Card['state'], last_review: row.lastReview ?? undefined,
})
const daysBetween = (a: Date | null | undefined, b: Date) => (a ? Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86_400_000)) : 0)

export async function reviewTopic(db: Db, learnerId: number, topicId: number, grade: Grade, now = new Date()) {
  const existing = await db.srsCard.findUnique({ where: { learnerId_topicId: { learnerId, topicId } } })
  const card = existing ? toCard(existing) : createEmptyCard(now)
  const { card: next } = scheduler.next(card, now, grade)
  const data = {
    due: next.due, stability: next.stability, difficulty: next.difficulty, elapsedDays: daysBetween(existing?.lastReview, now),
    scheduledDays: next.scheduled_days, learningSteps: next.learning_steps, reps: next.reps, lapses: next.lapses,
    state: next.state, lastReview: now,
  }
  return db.srsCard.upsert({ where: { learnerId_topicId: { learnerId, topicId } }, update: data, create: { learnerId, topicId, ...data } })
}

/** Topics due for revision today, weakest first. */
export async function dueTopics(db: Db, learnerId: number, now = new Date()) {
  const cards = await db.srsCard.findMany({
    where: { learnerId, due: { lte: now } },
    include: { topic: { select: { id: true, title: true, unit: { select: { title: true, curriculumSubject: { select: { subject: { select: { name: true } } } } } } } } },
    orderBy: [{ lapses: 'desc' }, { due: 'asc' }],
    take: 20,
  })
  return cards.map((c) => ({
    topicId: c.topicId, topic: c.topic.title, unit: c.topic.unit.title, subject: c.topic.unit.curriculumSubject.subject.name,
    due: c.due, reps: c.reps, lapses: c.lapses,
  }))
}

/** After marking: refresh topic performance and the FSRS schedule from the attempt's answers. */
export async function recordAttemptPerformance(db: Db, attemptId: number) {
  const at = await db.assessmentAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { answers: { where: { finalScore: { not: null } }, include: { question: { select: { topicId: true, marks: true } } } } },
  })
  const byTopic = new Map<number, { got: number; max: number }>()
  for (const a of at.answers) {
    if (!a.question.topicId) continue
    const t = byTopic.get(a.question.topicId) ?? { got: 0, max: 0 }
    t.got += a.finalScore!; t.max += a.question.marks
    byTopic.set(a.question.topicId, t)
  }
  for (const [topicId, { got, max }] of byTopic) {
    const pct = max ? (got / max) * 100 : 0
    const prev = await db.topicPerformance.findUnique({ where: { learnerId_topicId: { learnerId: at.learnerId, topicId } } })
    const attempts = (prev?.attempts ?? 0) + 1
    const avgPct = prev ? (prev.avgPct * prev.attempts + pct) / attempts : pct
    await db.topicPerformance.upsert({
      where: { learnerId_topicId: { learnerId: at.learnerId, topicId } },
      update: { attempts, avgPct: Math.round(avgPct), lastPct: Math.round(pct) },
      create: { learnerId: at.learnerId, topicId, attempts, avgPct: Math.round(pct), lastPct: Math.round(pct) },
    })
    await reviewTopic(db, at.learnerId, topicId, ratingFromPct(pct), at.submittedAt ?? new Date())
  }
}

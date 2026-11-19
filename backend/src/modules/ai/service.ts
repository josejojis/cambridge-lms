import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import type { Db } from '../../lib/db'
import { env } from '../../lib/env'
import { htmlToText } from '../../lib/html'

/**
 * AI assistance, always with a human in charge:
 *  - hints for PRACTICE only (never during mock/timed exams), grounded in Elite Revision's own lesson notes
 *  - marking SUGGESTIONS for teachers: the teacher accepts or overrides; AI never writes a score
 * Privacy (Kenya DPA, children's data): no names, usernames or emails are sent, only question text,
 * curriculum content and the anonymous answer text. Every call is logged in ai_interactions.
 */

export class AiUnavailableError extends Error { statusCode = 503 }
export class AiRefusedError extends Error { statusCode = 422 }

const PRACTICE_TYPES = new Set(['topic_quiz', 'practice_test'])
let client: Anthropic | null = null
const getClient = () => {
  if (!env.ANTHROPIC_API_KEY) throw new AiUnavailableError('AI features are not configured on this server.')
  return (client ??= new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }))
}

async function featureEnabled(db: Db, key: string) {
  const s = await db.systemSetting.findUnique({ where: { key } })
  return s?.value === true
}

// ── Hints ───────────────────────────────────────────────────────────────────
const HINT_SYSTEM = `You are a patient revision tutor for school learners (Cambridge International and Kenya CBC).
Give ONE short hint (at most 3 sentences) that helps the learner take the next step on the question.
Never state the final answer, the correct option, or a fully worked solution.
Use simple language suitable for the learner's level. Base the hint on the provided lesson notes when relevant.`

export async function generateHint(db: Db, userId: number, questionId: number, attemptPublicId?: string) {
  if (!(await featureEnabled(db, 'features.ai_hints'))) throw new AiUnavailableError('Hints are switched off.')

  if (attemptPublicId) {
    const attempt = await db.assessmentAttempt.findUnique({ where: { publicId: attemptPublicId }, include: { assessment: true } })
    if (!attempt || attempt.learnerId !== userId) throw Object.assign(new Error('Attempt not found'), { statusCode: 404 })
    if (!PRACTICE_TYPES.has(attempt.assessment.type))
      throw Object.assign(new Error('Hints are not available during examinations.'), { statusCode: 403 })
  }

  const q = await db.question.findUniqueOrThrow({
    where: { id: questionId },
    include: {
      options: { orderBy: { sortOrder: 'asc' }, select: { labelHtml: true } }, // labels only: never isCorrect
      topic: { include: { lessons: { where: { status: 'published' }, take: 2, include: { sections: { orderBy: { sortOrder: 'asc' }, take: 3 } } } } },
    },
  })
  const notes = q.topic?.lessons.flatMap((l) => l.sections.map((s) => `${s.title}: ${htmlToText(s.bodyHtml)}`)).join('\n').slice(0, 6000) ?? ''
  const options = q.options.length ? `\nOptions:\n${q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${htmlToText(o.labelHtml)}`).join('\n')}` : ''

  const response = await getClient().messages.create({
    model: env.AI_HINT_MODEL,
    max_tokens: 1024,
    output_config: { effort: 'low' },
    system: HINT_SYSTEM,
    messages: [{
      role: 'user',
      content: `<lesson_notes topic="${q.topic?.title ?? 'General'}">\n${notes}\n</lesson_notes>\n\n<question>\n${htmlToText(q.stemHtml)}${options}\n</question>\n\nGive one hint.`,
    }],
  })
  if (response.stop_reason === 'refusal') throw new AiRefusedError('A hint could not be generated for this question.')
  const hint = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim()

  await db.aiInteraction.create({ data: {
    userId, kind: 'hint', entityType: 'question', entityId: String(questionId), model: response.model,
    inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens, output: { hint },
  } })
  return { hint }
}

// ── Marking suggestions ─────────────────────────────────────────────────────
export const MarkingSuggestion = z.object({
  criteria: z.array(z.object({
    point: z.string(),
    awarded: z.number(),
    available: z.number(),
    evidence: z.string().describe('Short quote or paraphrase from the answer supporting the decision, or "not addressed"'),
  })),
  suggestedMarks: z.number(),
  feedbackForLearner: z.string().describe('2-3 encouraging, specific sentences addressed to the learner'),
  confidence: z.enum(['low', 'medium', 'high']),
})
export type MarkingSuggestion = z.infer<typeof MarkingSuggestion>

const MARKING_SYSTEM = `You assist teachers marking written answers for school examinations.
Apply the marking scheme exactly. Award marks per criterion only where the answer clearly meets it.
Do not reward length or vocabulary on their own. Never exceed the marks available for a criterion.
The teacher makes the final decision; your output is a suggestion.`

export async function suggestMarking(db: Db, teacherId: number, answerId: number) {
  if (!(await featureEnabled(db, 'features.ai_marking_suggestions'))) throw new AiUnavailableError('Marking suggestions are switched off.')

  const a = await db.learnerAnswer.findUniqueOrThrow({
    where: { id: answerId },
    include: { question: { include: { markingScheme: true } } },
  })
  const scheme = a.question.markingScheme
  if (!scheme) throw Object.assign(new Error('This question has no marking scheme.'), { statusCode: 422 })
  const text = (a.response as { text?: string } | null)?.text?.trim()
  if (!text) throw Object.assign(new Error('There is no written answer to mark.'), { statusCode: 422 })

  const response = await getClient().messages.parse({
    model: env.AI_MARKING_MODEL,
    max_tokens: 16000,
    system: MARKING_SYSTEM,
    output_config: { effort: 'high', format: zodOutputFormat(MarkingSuggestion) },
    messages: [{
      role: 'user',
      content: `<question marks="${a.question.marks}">\n${htmlToText(a.question.stemHtml)}\n</question>\n\n` +
        `<marking_scheme>\n${JSON.stringify(scheme.criteria)}\n${scheme.guidanceHtml ? htmlToText(scheme.guidanceHtml) : ''}\n</marking_scheme>\n\n` +
        `<learner_answer>\n${text.slice(0, 20000)}\n</learner_answer>`,
    }],
  })
  if (response.stop_reason === 'refusal') throw new AiRefusedError('No suggestion could be generated for this answer.')
  const parsed = response.parsed_output
  if (!parsed) throw Object.assign(new Error('The AI response could not be read. Please mark manually.'), { statusCode: 502 })

  // Never trust model arithmetic: clamp to the scheme and question maximum.
  const suggestedMarks = Math.min(a.question.marks, Math.max(0, parsed.criteria.reduce((s, c) => s + Math.min(c.awarded, c.available), 0)))
  const suggestion = { ...parsed, suggestedMarks }

  const log = await db.aiInteraction.create({ data: {
    userId: teacherId, kind: 'marking_suggestion', entityType: 'learner_answer', entityId: String(answerId), model: response.model,
    inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens, output: suggestion,
  } })
  return { suggestionId: log.id, ...suggestion }
}

/** Maps SDK errors to HTTP-friendly errors (most specific first). */
export function mapAiError(e: unknown): Error & { statusCode?: number } {
  if (e instanceof AiUnavailableError || e instanceof AiRefusedError) return e
  if (e instanceof Anthropic.RateLimitError) return Object.assign(new Error('AI is busy, please try again shortly.'), { statusCode: 429 })
  if (e instanceof Anthropic.AuthenticationError) return Object.assign(new Error('AI is not configured correctly.'), { statusCode: 503 })
  if (e instanceof Anthropic.APIError) return Object.assign(new Error('AI service error. Please try again.'), { statusCode: 502 })
  return e as Error
}
